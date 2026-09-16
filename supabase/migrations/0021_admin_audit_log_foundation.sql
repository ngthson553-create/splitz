-- Splitz Console Admin - Phase 2 audit log foundation.
-- All future admin side effects must write here through guarded RPC/Edge code.

create table public.admin_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  actor_user_id   uuid references public.profiles (id) on delete set null,
  actor_email     text,
  actor_role      text check (actor_role in ('owner','operator','support','readonly')),
  action          text not null check (length(trim(action)) > 0),
  target_type     text,
  target_id       text,
  payload_summary jsonb not null default '{}'::jsonb,
  status          text not null check (status in ('success','failed')),
  error_message   text,
  created_at      timestamptz not null default now()
);

create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_user_id, created_at desc);
create index admin_audit_logs_action_idx on public.admin_audit_logs (action, created_at desc);
create index admin_audit_logs_status_idx on public.admin_audit_logs (status, created_at desc);

alter table public.admin_audit_logs enable row level security;

-- Do not expose raw audit rows directly to client roles. Use guarded RPCs below.
revoke all on table public.admin_audit_logs from anon, authenticated;
grant all on table public.admin_audit_logs to service_role;

create or replace function public.assert_console_admin()
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'not_console_admin' using errcode = '42501';
  end if;

  select au.role into v_role
  from public.admin_users au
  where au.user_id = auth.uid()
    and au.status = 'active'
  limit 1;

  if v_role is null then
    raise exception 'not_console_admin' using errcode = '42501';
  end if;

  return v_role;
end;
$$;

create or replace function public.redact_admin_audit_payload(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = public
immutable
as $$
declare
  v_result jsonb;
  v_item record;
  v_key text;
begin
  if p_payload is null then
    return '{}'::jsonb;
  end if;

  if jsonb_typeof(p_payload) = 'object' then
    v_result := '{}'::jsonb;
    for v_item in select key, value from jsonb_each(p_payload) loop
      v_key := lower(regexp_replace(v_item.key, '[^a-zA-Z0-9]+', '_', 'g'));
      if v_key = any (array[
          'api_key', 'apikey', 'authorization', 'password', 'private_key',
          'secret', 'service_role', 'token', 'access_token', 'refresh_token',
          'resend_api_key', 'openai_api_key', 'gemini_api_key',
          'vapid_private_key', 'payos_checksum_key'
        ])
        or v_key like '%secret%'
        or v_key like '%token%'
        or v_key like '%password%'
        or v_key like '%api_key%'
        or v_key like '%private_key%'
        or v_key like '%authorization%'
      then
        v_result := v_result || jsonb_build_object(v_item.key, '[redacted]');
      else
        v_result := v_result || jsonb_build_object(v_item.key, public.redact_admin_audit_payload(v_item.value));
      end if;
    end loop;
    return v_result;
  end if;

  if jsonb_typeof(p_payload) = 'array' then
    select coalesce(jsonb_agg(public.redact_admin_audit_payload(elem.value)), '[]'::jsonb)
    into v_result
    from jsonb_array_elements(p_payload) as elem(value);
    return v_result;
  end if;

  return p_payload;
end;
$$;

create or replace function public.admin_write_audit_log(
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_payload_summary jsonb default '{}'::jsonb,
  p_status text default 'success',
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_email text;
  v_id uuid;
begin
  v_role := public.assert_console_admin();

  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'audit_action_required' using errcode = '22023';
  end if;

  select p.email into v_email
  from public.profiles p
  where p.id = auth.uid();

  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    actor_role,
    action,
    target_type,
    target_id,
    payload_summary,
    status,
    error_message
  ) values (
    auth.uid(),
    v_email,
    v_role,
    trim(p_action),
    nullif(trim(coalesce(p_target_type, '')), ''),
    nullif(trim(coalesce(p_target_id, '')), ''),
    public.redact_admin_audit_payload(coalesce(p_payload_summary, '{}'::jsonb)),
    p_status,
    nullif(left(coalesce(p_error_message, ''), 2000), '')
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_list_audit_logs(
  p_status text default null,
  p_action text default null,
  p_limit int default 50
)
returns table (
  id uuid,
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  action text,
  target_type text,
  target_id text,
  payload_summary jsonb,
  status text,
  error_message text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  perform public.assert_console_admin();

  return query
  select
    l.id,
    l.actor_user_id,
    coalesce(l.actor_email, p.email) as actor_email,
    l.actor_role,
    l.action,
    l.target_type,
    l.target_id,
    l.payload_summary,
    l.status,
    l.error_message,
    l.created_at
  from public.admin_audit_logs l
  left join public.profiles p on p.id = l.actor_user_id
  where (p_status is null or l.status = p_status)
    and (p_action is null or l.action ilike '%' || trim(p_action) || '%')
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

revoke all on function public.assert_console_admin() from public;
revoke all on function public.redact_admin_audit_payload(jsonb) from public;
revoke all on function public.admin_write_audit_log(text, text, text, jsonb, text, text) from public;
revoke all on function public.admin_list_audit_logs(text, text, int) from public;

grant execute on function public.assert_console_admin() to authenticated, service_role;
grant execute on function public.admin_write_audit_log(text, text, text, jsonb, text, text) to authenticated, service_role;
grant execute on function public.admin_list_audit_logs(text, text, int) to authenticated, service_role;
