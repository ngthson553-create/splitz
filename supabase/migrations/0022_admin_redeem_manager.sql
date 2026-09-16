-- Splitz Console Admin - Phase 3 redeem code manager.
-- Admin create/revoke actions are guarded server-side and must write audit logs.

create table public.redeem_code_batches (
  id            uuid primary key default gen_random_uuid(),
  prefix        text not null,
  plan          text not null check (plan in ('personal','team')),
  duration_days int not null check (duration_days > 0),
  max_uses      int not null default 1 check (max_uses > 0),
  code_count    int not null check (code_count > 0),
  expires_at    timestamptz,
  internal_note text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.redeem_code_batches enable row level security;
revoke all on table public.redeem_code_batches from anon, authenticated;
grant all on table public.redeem_code_batches to service_role;

alter table public.redemption_codes
  add column status text not null default 'active' check (status in ('active','revoked')),
  add column revoked_at timestamptz,
  add column revoked_by uuid references public.profiles (id) on delete set null,
  add column internal_note text,
  add column batch_id uuid references public.redeem_code_batches (id) on delete set null;

create index redemption_codes_status_idx on public.redemption_codes (status, created_at desc);
create index redemption_codes_batch_idx on public.redemption_codes (batch_id);

create or replace function public.redeem_code_effective_status(
  p_status text,
  p_used_count int,
  p_max_uses int,
  p_expires_at timestamptz
)
returns text
language sql
stable
as $$
  select case
    when coalesce(p_status, 'active') = 'revoked' then 'revoked'
    when p_expires_at is not null and p_expires_at < now() then 'expired'
    when coalesce(p_used_count, 0) >= coalesce(p_max_uses, 1) then 'exhausted'
    else 'active'
  end;
$$;

create or replace function public.generate_admin_redeem_code(p_prefix text default 'SPLITZ')
returns text
language plpgsql
set search_path = public
volatile
as $$
declare
  v_prefix text := upper(regexp_replace(coalesce(nullif(trim(p_prefix), ''), 'SPLITZ'), '[^a-zA-Z0-9]+', '', 'g'));
  v_code text;
begin
  if length(v_prefix) = 0 then
    v_prefix := 'SPLITZ';
  end if;
  v_prefix := left(v_prefix, 16);

  loop
    v_code := v_prefix || '-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.redemption_codes rc where rc.code = v_code);
  end loop;

  return v_code;
end;
$$;

create or replace function public.admin_redeem_payload(
  p_code text,
  p_plan text,
  p_duration_days int,
  p_max_uses int,
  p_expires_at timestamptz,
  p_batch_id uuid default null,
  p_reason text default null
)
returns jsonb
language sql
stable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'code', p_code,
    'plan', p_plan,
    'duration_days', p_duration_days,
    'max_uses', p_max_uses,
    'expires_at', p_expires_at,
    'batch_id', p_batch_id,
    'reason', p_reason
  ));
$$;

create or replace function public.admin_create_redeem_code(
  p_code text default null,
  p_plan text default 'personal',
  p_duration_days int default 30,
  p_max_uses int default 1,
  p_expires_at timestamptz default null,
  p_internal_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  v_role := public.assert_console_admin();
  if v_role not in ('owner','operator') then
    raise exception 'admin_role_not_allowed' using errcode = '42501';
  end if;

  if p_plan not in ('personal','team') or p_duration_days < 1 or p_max_uses < 1 then
    raise exception 'invalid_redeem_config' using errcode = '22023';
  end if;

  if length(v_code) = 0 then
    v_code := public.generate_admin_redeem_code('SPLITZ');
  end if;

  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,48}$' then
    raise exception 'invalid_redeem_code_format' using errcode = '22023';
  end if;

  insert into public.redemption_codes (
    code,
    plan,
    duration_days,
    max_uses,
    expires_at,
    created_by,
    internal_note
  ) values (
    v_code,
    p_plan,
    p_duration_days,
    p_max_uses,
    p_expires_at,
    auth.uid(),
    nullif(trim(coalesce(p_internal_note, '')), '')
  );

  perform public.admin_write_audit_log(
    'redeem.create',
    'redemption_code',
    v_code,
    public.admin_redeem_payload(v_code, p_plan, p_duration_days, p_max_uses, p_expires_at),
    'success',
    null
  );

  return v_code;
exception when others then
  if auth.uid() is not null and public.is_console_admin(auth.uid()) then
    perform public.admin_write_audit_log(
      'redeem.create',
      'redemption_code',
      nullif(v_code, ''),
      public.admin_redeem_payload(nullif(v_code, ''), p_plan, p_duration_days, p_max_uses, p_expires_at),
      'failed',
      sqlerrm
    );
  end if;
  return null;
end;
$$;

create or replace function public.admin_create_redeem_batch(
  p_prefix text default 'SPLITZ',
  p_count int default 10,
  p_plan text default 'personal',
  p_duration_days int default 30,
  p_max_uses int default 1,
  p_expires_at timestamptz default null,
  p_internal_note text default null
)
returns table (batch_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_batch_id uuid;
  v_code text;
  v_prefix text := upper(regexp_replace(coalesce(nullif(trim(p_prefix), ''), 'SPLITZ'), '[^a-zA-Z0-9]+', '', 'g'));
  v_i int;
begin
  v_role := public.assert_console_admin();
  if v_role not in ('owner','operator') then
    raise exception 'admin_role_not_allowed' using errcode = '42501';
  end if;

  if p_plan not in ('personal','team') or p_duration_days < 1 or p_max_uses < 1 or p_count < 1 or p_count > 200 then
    raise exception 'invalid_redeem_batch_config' using errcode = '22023';
  end if;

  if length(v_prefix) = 0 then
    v_prefix := 'SPLITZ';
  end if;
  v_prefix := left(v_prefix, 16);

  insert into public.redeem_code_batches (
    prefix,
    plan,
    duration_days,
    max_uses,
    code_count,
    expires_at,
    internal_note,
    created_by
  ) values (
    v_prefix,
    p_plan,
    p_duration_days,
    p_max_uses,
    p_count,
    p_expires_at,
    nullif(trim(coalesce(p_internal_note, '')), ''),
    auth.uid()
  ) returning id into v_batch_id;

  for v_i in 1..p_count loop
    v_code := public.generate_admin_redeem_code(v_prefix);
    insert into public.redemption_codes (
      code,
      plan,
      duration_days,
      max_uses,
      expires_at,
      created_by,
      internal_note,
      batch_id
    ) values (
      v_code,
      p_plan,
      p_duration_days,
      p_max_uses,
      p_expires_at,
      auth.uid(),
      nullif(trim(coalesce(p_internal_note, '')), ''),
      v_batch_id
    );

    batch_id := v_batch_id;
    code := v_code;
    return next;
  end loop;

  perform public.admin_write_audit_log(
    'redeem.batch_create',
    'redeem_code_batch',
    v_batch_id::text,
    public.admin_redeem_payload(v_prefix, p_plan, p_duration_days, p_max_uses, p_expires_at, v_batch_id) || jsonb_build_object('count', p_count),
    'success',
    null
  );

  return;
exception when others then
  if auth.uid() is not null and public.is_console_admin(auth.uid()) then
    perform public.admin_write_audit_log(
      'redeem.batch_create',
      'redeem_code_batch',
      v_batch_id::text,
      public.admin_redeem_payload(v_prefix, p_plan, p_duration_days, p_max_uses, p_expires_at, v_batch_id) || jsonb_build_object('count', p_count),
      'failed',
      sqlerrm
    );
  end if;
  return;
end;
$$;

create or replace function public.admin_redeem_rows(p_search text default null, p_status text default null, p_limit int default 50)
returns table (
  code text,
  plan text,
  duration_days int,
  max_uses int,
  used_count int,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  internal_note text,
  batch_id uuid,
  batch_prefix text,
  uses jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  with rows as (
    select
      rc.code,
      rc.plan,
      rc.duration_days,
      rc.max_uses,
      rc.used_count,
      public.redeem_code_effective_status(rc.status, rc.used_count, rc.max_uses, rc.expires_at) as effective_status,
      rc.expires_at,
      rc.created_at,
      rc.internal_note,
      rc.batch_id,
      b.prefix as batch_prefix,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', ru.id,
          'used_by', ru.used_by,
          'used_email', p.email,
          'used_at', ru.used_at
        ) order by ru.used_at desc)
        from public.redemption_uses ru
        left join public.profiles p on p.id = ru.used_by
        where ru.code = rc.code
      ), '[]'::jsonb) as uses
    from public.redemption_codes rc
    left join public.redeem_code_batches b on b.id = rc.batch_id
  )
  select
    rows.code,
    rows.plan,
    rows.duration_days,
    rows.max_uses,
    rows.used_count,
    rows.effective_status as status,
    rows.expires_at,
    rows.created_at,
    rows.internal_note,
    rows.batch_id,
    rows.batch_prefix,
    rows.uses
  from rows
  where (p_search is null or rows.code ilike '%' || trim(p_search) || '%' or rows.internal_note ilike '%' || trim(p_search) || '%' or rows.batch_prefix ilike '%' || trim(p_search) || '%')
    and (p_status is null or rows.effective_status = p_status)
  order by rows.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.admin_list_redeem_codes(
  p_search text default null,
  p_status text default null,
  p_limit int default 50
)
returns table (
  code text,
  plan text,
  duration_days int,
  max_uses int,
  used_count int,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  internal_note text,
  batch_id uuid,
  batch_prefix text,
  uses jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_console_admin();
  return query select * from public.admin_redeem_rows(p_search, p_status, p_limit);
end;
$$;

create or replace function public.admin_lookup_redeem_code(p_code text)
returns table (
  code text,
  plan text,
  duration_days int,
  max_uses int,
  used_count int,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  internal_note text,
  batch_id uuid,
  batch_prefix text,
  uses jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_console_admin();
  return query select * from public.admin_redeem_rows(upper(btrim(p_code)), null, 1);
end;
$$;

create or replace function public.admin_revoke_redeem_code(p_code text, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_existing public.redemption_codes;
begin
  v_role := public.assert_console_admin();
  if v_role not in ('owner','operator') then
    raise exception 'admin_role_not_allowed' using errcode = '42501';
  end if;

  select * into v_existing from public.redemption_codes rc where rc.code = v_code;
  if v_existing.code is null then
    raise exception 'redeem_code_not_found' using errcode = 'P0002';
  end if;

  update public.redemption_codes
  set status = 'revoked',
      revoked_at = coalesce(revoked_at, now()),
      revoked_by = coalesce(revoked_by, auth.uid()),
      internal_note = coalesce(nullif(trim(coalesce(p_reason, '')), ''), internal_note)
  where code = v_code;

  perform public.admin_write_audit_log(
    'redeem.revoke',
    'redemption_code',
    v_code,
    public.admin_redeem_payload(v_code, v_existing.plan, v_existing.duration_days, v_existing.max_uses, v_existing.expires_at, v_existing.batch_id, p_reason),
    'success',
    null
  );

  return v_code;
exception when others then
  if auth.uid() is not null and public.is_console_admin(auth.uid()) then
    perform public.admin_write_audit_log(
      'redeem.revoke',
      'redemption_code',
      nullif(v_code, ''),
      jsonb_build_object('code', nullif(v_code, ''), 'reason', p_reason),
      'failed',
      sqlerrm
    );
  end if;
  return null;
end;
$$;

create or replace function public.redeem_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code public.redemption_codes;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;

  select * into v_code from public.redemption_codes where code = upper(btrim(p_code));
  if v_code.code is null then
    raise exception 'Mã không tồn tại.' using errcode = 'P0002';
  end if;
  if coalesce(v_code.status, 'active') <> 'active' or v_code.revoked_at is not null then
    raise exception 'Mã đã bị thu hồi.' using errcode = 'P0001';
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'Mã đã hết hạn.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.redemption_uses where code = v_code.code and used_by = v_uid) then
    raise exception 'Bạn đã dùng mã này rồi.' using errcode = 'P0001';
  end if;

  update public.redemption_codes
    set used_count = used_count + 1
    where code = v_code.code
      and used_count < max_uses
      and status = 'active'
      and (expires_at is null or expires_at >= now());
  if not found then
    raise exception 'Mã đã hết lượt sử dụng.' using errcode = 'P0001';
  end if;

  insert into public.redemption_uses (code, used_by) values (v_code.code, v_uid);
  perform public.grant_subscription(v_uid, v_code.plan, v_code.duration_days, 'redemption');
  return v_code.plan;
end;
$$;

revoke all on function public.redeem_code_effective_status(text, int, int, timestamptz) from public;
revoke all on function public.generate_admin_redeem_code(text) from public;
revoke all on function public.admin_redeem_payload(text, text, int, int, timestamptz, uuid, text) from public;
revoke all on function public.admin_create_redeem_code(text, text, int, int, timestamptz, text) from public;
revoke all on function public.admin_create_redeem_batch(text, int, text, int, int, timestamptz, text) from public;
revoke all on function public.admin_redeem_rows(text, text, int) from public;
revoke all on function public.admin_list_redeem_codes(text, text, int) from public;
revoke all on function public.admin_lookup_redeem_code(text) from public;
revoke all on function public.admin_revoke_redeem_code(text, text) from public;

grant execute on function public.admin_create_redeem_code(text, text, int, int, timestamptz, text) to authenticated, service_role;
grant execute on function public.admin_create_redeem_batch(text, int, text, int, int, timestamptz, text) to authenticated, service_role;
grant execute on function public.admin_list_redeem_codes(text, text, int) to authenticated, service_role;
grant execute on function public.admin_lookup_redeem_code(text) to authenticated, service_role;
grant execute on function public.admin_revoke_redeem_code(text, text) to authenticated, service_role;

grant execute on function public.redeem_code(text) to authenticated;
