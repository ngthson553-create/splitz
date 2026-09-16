-- Splitz — Slice 6: hạ tầng nhắc gia hạn (web push + theo dõi đã nhắc).
-- Kênh email (Resend) + web push do Edge Function `send-reminders` gửi, chạy theo
-- lịch (pg_cron) mỗi ngày. In-app banner tính phía client (subscription.expiringSoon).

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_self_select on public.push_subscriptions
  for select using (user_id = auth.uid());
create policy push_self_insert on public.push_subscriptions
  for insert with check (user_id = auth.uid());
create policy push_self_delete on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- Đánh dấu đã gửi nhắc cho chu kỳ hiện tại (tránh nhắc lặp mỗi ngày).
alter table public.subscriptions add column if not exists reminder_sent_at timestamptz;

-- ── Lịch chạy (THAM KHẢO — chạy thủ công sau khi bật pg_cron + pg_net) ──
-- Cần: extension pg_cron, pg_net; và đặt service role key an toàn (Vault).
-- Ví dụ gọi Edge Function mỗi ngày 08:00:
--
--   select cron.schedule('splitz-renewal-reminders', '0 8 * * *', $$
--     select net.http_post(
--       url := 'https://<PROJECT_REF>.functions.supabase.co/send-reminders',
--       headers := jsonb_build_object(
--         'Content-Type','application/json',
--         'Authorization','Bearer <SERVICE_ROLE_KEY>'
--       ),
--       body := '{}'::jsonb
--     );
--   $$);
