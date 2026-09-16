-- Splitz Console Admin - Phase 10 system config / feature flags / limits / maintenance.

create table public.maintenance_banners (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  enabled     boolean not null default false,
  severity    text not null default 'info' check (severity in ('info','warning','critical')),
  title       text not null default '',
  message     text not null default '',
  starts_at   timestamptz,
  ends_at     timestamptz,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index maintenance_banners_updated_idx on public.maintenance_banners (updated_at desc);

alter table public.maintenance_banners enable row level security;
revoke all on table public.maintenance_banners from anon, authenticated;
grant all on table public.maintenance_banners to service_role;

insert into public.maintenance_banners (key, enabled, severity, title, message)
values ('global', false, 'info', 'Bảo trì hệ thống', '')
on conflict (key) do nothing;

insert into public.feature_flags (key, label, description, enabled)
values
  ('payments', 'Thanh toán PayOS', 'Bật/tắt luồng tạo đơn thanh toán PayOS.', true),
  ('redeem', 'Redeem code', 'Bật/tắt luồng redeem code premium.', true),
  ('debt_reminder', 'Nhắc nợ', 'Bật/tắt nhắc nợ một chạm và liên quan.', true),
  ('zalo_login', 'Đăng nhập Zalo', 'Bật/tắt luồng đăng nhập/liên kết Zalo.', true)
on conflict (key) do nothing;

insert into public.app_config (key, category, value)
values
  ('plan_limits', 'limits', '{"free_max_groups":3,"free_max_members":8,"premium_max_groups":null,"premium_max_members":25}'::jsonb),
  ('operation_limits', 'limits', '{"debt_cooldown_hours":24,"redeem_duration_days":30,"redeem_max_uses":1}'::jsonb),
  ('legal_disclaimer', 'system', '{"payment":"Thanh toán xử lý qua PayOS.","legal":"Splitz hỗ trợ chia tiền, không phải ví điện tử."}'::jsonb)
on conflict (key) do nothing;

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

  if exists (select 1 from public.feature_flags where key = 'redeem' and enabled = false) then
    raise exception 'Đổi mã đang tạm dừng.' using errcode = 'P0001';
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

grant execute on function public.redeem_code(text) to authenticated;

create or replace function public.current_maintenance_banner()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_build_object(
    'enabled', mb.enabled,
    'severity', mb.severity,
    'title', mb.title,
    'message', mb.message,
    'starts_at', mb.starts_at,
    'ends_at', mb.ends_at
  ), '{"enabled":false}'::jsonb)
  from public.maintenance_banners mb
  where mb.key = 'global'
  order by mb.updated_at desc
  limit 1;
$$;

revoke all on function public.current_maintenance_banner() from public;
grant execute on function public.current_maintenance_banner() to anon, authenticated, service_role;
