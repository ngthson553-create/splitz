-- Splitz Console Admin - Phase 8 billing indexes.
-- Tối ưu list/search subscription và payment order cho console billing.

create index if not exists subscriptions_status_updated_idx
  on public.subscriptions (status, updated_at desc);

create index if not exists subscriptions_source_updated_idx
  on public.subscriptions (source, updated_at desc);

create index if not exists payment_orders_status_created_idx
  on public.payment_orders (status, created_at desc);

create index if not exists payment_orders_user_status_created_idx
  on public.payment_orders (user_id, status, created_at desc);
