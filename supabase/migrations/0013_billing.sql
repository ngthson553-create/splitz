-- Splitz — Slice 6: billing (đơn thanh toán PayOS + mã kích hoạt + gia hạn gói).

-- ── Đơn thanh toán PayOS (webhook tra cứu để biết kích hoạt cho ai) ──
create table public.payment_orders (
  order_code bigint primary key,            -- mã đơn gửi PayOS (số)
  user_id    uuid not null references public.profiles (id) on delete cascade,
  plan       text not null check (plan in ('personal','team')),
  cycle      text not null check (cycle in ('month','year')),
  amount     int  not null,
  status     text not null default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);
create index payment_orders_user_idx on public.payment_orders (user_id, created_at desc);

alter table public.payment_orders enable row level security;
create policy payment_orders_self_select on public.payment_orders
  for select using (user_id = auth.uid());
-- Ghi chỉ qua Edge Function (service role) — không có policy insert/update cho client.

-- ── Gia hạn/kích hoạt gói (dùng chung redeem + webhook PayOS) ──
-- Gia hạn cộng dồn: nếu còn hạn thì cộng tiếp từ period_end, ngược lại từ now().
-- KHÔNG cấp execute cho 'authenticated' (tránh tự kích hoạt) — chỉ redeem_code (definer)
-- và service role (webhook) gọi được.
create or replace function public.grant_subscription(
  p_uid uuid, p_plan text, p_days int, p_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base timestamptz;
begin
  select period_end into v_base from public.subscriptions where user_id = p_uid;
  v_base := greatest(now(), coalesce(v_base, now()));
  insert into public.subscriptions (user_id, plan, status, period_end, source)
  values (p_uid, p_plan, 'active', v_base + make_interval(days => p_days), p_source)
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = 'active',
    period_end = excluded.period_end,
    source = excluded.source,
    updated_at = now();
end;
$$;
revoke execute on function public.grant_subscription(uuid, text, int, text) from public, authenticated;
-- Webhook PayOS gọi qua service role → cần execute; redeem_code (definer) gọi nội bộ được.
grant execute on function public.grant_subscription(uuid, text, int, text) to service_role;

-- ── Mã kích hoạt premium (chủ dự án/dev/beta — không cần thanh toán) ──
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
  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'Mã đã hết hạn.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.redemption_uses where code = v_code.code and used_by = v_uid) then
    raise exception 'Bạn đã dùng mã này rồi.' using errcode = 'P0001';
  end if;

  -- Tăng lượt dùng nguyên tử (khoá theo điều kiện) → 2 người dùng cùng lúc không vượt.
  update public.redemption_codes
    set used_count = used_count + 1
    where code = v_code.code and used_count < max_uses;
  if not found then
    raise exception 'Mã đã hết lượt sử dụng.' using errcode = 'P0001';
  end if;

  insert into public.redemption_uses (code, used_by) values (v_code.code, v_uid);
  perform public.grant_subscription(v_uid, v_code.plan, v_code.duration_days, 'redemption');
  return v_code.plan;
end;
$$;

grant execute on function public.redeem_code(text) to authenticated;
