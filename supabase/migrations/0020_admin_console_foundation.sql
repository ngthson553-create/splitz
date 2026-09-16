-- Splitz Console Admin - Phase 1 foundation.
-- Route `/console` is intentionally hidden from normal users, but real access is
-- enforced here through Supabase Auth user_id + admin_users.

create table public.admin_users (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  role       text not null check (role in ('owner','operator','support','readonly')),
  status     text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index admin_users_status_idx on public.admin_users (status, role);

alter table public.admin_users enable row level security;

-- A user may only see their own admin row. Admin list/management later must go
-- through guarded RPC/Edge Functions, not direct table access from the client.
create policy admin_users_self_select on public.admin_users
  for select using (user_id = auth.uid());

create or replace function public.is_console_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = uid
      and au.status = 'active'
      and au.role in ('owner','operator','support','readonly')
  );
$$;

create or replace function public.my_admin_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select au.role
  from public.admin_users au
  where au.user_id = auth.uid()
    and au.status = 'active'
  limit 1;
$$;

revoke all on function public.is_console_admin(uuid) from public;
revoke all on function public.my_admin_role() from public;
grant execute on function public.is_console_admin(uuid) to authenticated, service_role;
grant execute on function public.my_admin_role() to authenticated;

-- Bootstrap the first owner without hardcoding anyone's email in the repo.
-- Set the bootstrap owner once per environment:
--
--   alter database postgres set app.bootstrap_admin_email = 'you@example.com';
--
-- (Supabase: run the same statement in the SQL editor, then reconnect so new
-- sessions pick the setting up.) With it unset nothing is auto-promoted and the
-- trigger below stays inert; grant the first owner by hand instead:
--
--   insert into public.admin_users (user_id, role, status, created_by)
--   select p.id, 'owner', 'active', p.id
--   from public.profiles p
--   where lower(p.email) = lower('<your-email>')
--   on conflict (user_id) do update set role = 'owner', status = 'active';

create or replace function public.console_bootstrap_email()
returns text
language sql
stable
as $$
  select coalesce(nullif(btrim(current_setting('app.bootstrap_admin_email', true)), ''), '');
$$;

revoke all on function public.console_bootstrap_email() from public;

-- Seed now if the bootstrap profile already exists.
insert into public.admin_users (user_id, role, status, created_by)
select p.id, 'owner', 'active', p.id
from public.profiles p
where public.console_bootstrap_email() <> ''
  and lower(p.email) = lower(public.console_bootstrap_email())
on conflict (user_id) do update set
  role = 'owner',
  status = 'active';

-- Seed on sign-up when the bootstrap account is created later by auth onboarding.
create or replace function public.seed_console_owner_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.console_bootstrap_email() <> ''
     and lower(new.email) = lower(public.console_bootstrap_email()) then
    insert into public.admin_users (user_id, role, status, created_by)
    values (new.id, 'owner', 'active', new.id)
    on conflict (user_id) do update set
      role = 'owner',
      status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_seed_console_owner on public.profiles;
create trigger trg_profiles_seed_console_owner
  after insert or update of email on public.profiles
  for each row execute function public.seed_console_owner_from_profile();
