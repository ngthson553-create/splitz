-- Splitz Console Admin Phase 9: read-only support lookup indexes.
-- Khong thay doi du lieu business; chi toi uu cac truy van support 360.

create index if not exists group_members_user_joined_idx
  on public.group_members (user_id, joined_at desc)
  where user_id is not null;

create index if not exists redemption_uses_used_by_used_at_idx
  on public.redemption_uses (used_by, used_at desc);

create index if not exists push_subscriptions_user_created_idx
  on public.push_subscriptions (user_id, created_at desc);

create index if not exists settlements_group_created_idx
  on public.settlements (group_id, created_at desc);
