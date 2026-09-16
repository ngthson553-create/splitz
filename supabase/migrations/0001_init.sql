-- Splitz v0.1 — schema tối giản cho adapter cloud (aggregate JSONB).
-- Chạy: supabase db push  (hoặc dán vào SQL editor).

create extension if not exists "pgcrypto";

create table if not exists public.groups (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists groups_owner_idx on public.groups (owner_id, updated_at desc);

alter table public.groups enable row level security;

-- Chủ sở hữu toàn quyền với nhóm của mình.
drop policy if exists "groups_owner_all" on public.groups;
create policy "groups_owner_all"
  on public.groups
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
