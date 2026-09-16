-- Splitz Console Admin - Phase 4 notification center MVP.
-- In-app notifications are persisted in DB and surfaced in `/notifications`.

create table public.system_notifications (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text not null,
  href            text,
  target_type     text not null check (target_type in ('all','free','premium','user','group')),
  target_value    text,
  status          text not null default 'draft' check (status in ('draft','scheduled','sending','sent','failed','cancelled')),
  channel_in_app  boolean not null default true,
  channel_web_push boolean not null default true,
  target_count    int not null default 0 check (target_count >= 0),
  in_app_sent     int not null default 0 check (in_app_sent >= 0),
  push_sent       int not null default 0 check (push_sent >= 0),
  push_failed     int not null default 0 check (push_failed >= 0),
  payload         jsonb not null default '{}'::jsonb,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  check (channel_in_app or channel_web_push)
);
create index system_notifications_status_idx on public.system_notifications (status, created_at desc);
create index system_notifications_created_idx on public.system_notifications (created_at desc);

create table public.notification_jobs (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid references public.system_notifications (id) on delete cascade,
  job_type        text not null check (job_type in ('send_now','schedule','recurring')),
  status          text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  target_type     text not null check (target_type in ('all','free','premium','user','group')),
  target_value    text,
  target_count    int not null default 0 check (target_count >= 0),
  in_app_sent     int not null default 0 check (in_app_sent >= 0),
  push_sent       int not null default 0 check (push_sent >= 0),
  push_failed     int not null default 0 check (push_failed >= 0),
  preview_payload jsonb not null default '{}'::jsonb,
  result_summary  jsonb not null default '{}'::jsonb,
  error_message   text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  scheduled_at    timestamptz,
  started_at      timestamptz,
  finished_at     timestamptz
);
create index notification_jobs_status_idx on public.notification_jobs (status, created_at desc);
create index notification_jobs_notification_idx on public.notification_jobs (notification_id, created_at desc);

create table public.notification_deliveries (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.system_notifications (id) on delete cascade,
  job_id          uuid references public.notification_jobs (id) on delete cascade,
  user_id         uuid references public.profiles (id) on delete cascade,
  user_email      text,
  channel         text not null check (channel in ('in_app','web_push')),
  status          text not null check (status in ('pending','sent','failed','skipped')),
  title           text not null,
  body            text not null,
  href            text,
  target_type     text not null check (target_type in ('all','free','premium','user','group')),
  target_value    text,
  payload         jsonb not null default '{}'::jsonb,
  error_message   text,
  sent_at         timestamptz,
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (notification_id, user_id, channel)
);
create index notification_deliveries_notification_idx on public.notification_deliveries (notification_id, created_at desc);
create index notification_deliveries_user_idx on public.notification_deliveries (user_id, channel, created_at desc);
create index notification_deliveries_read_idx on public.notification_deliveries (user_id, read_at, channel);

create table public.notification_templates (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  body          text not null,
  href          text,
  target_type   text not null default 'all' check (target_type in ('all','free','premium','user','group')),
  channel_in_app boolean not null default true,
  channel_web_push boolean not null default true,
  description   text,
  active        boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.system_notifications enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_templates enable row level security;

revoke all on table public.system_notifications from anon, authenticated;
revoke all on table public.notification_jobs from anon, authenticated;
revoke all on table public.notification_deliveries from anon, authenticated;
revoke all on table public.notification_templates from anon, authenticated;

grant all on table public.system_notifications to service_role;
grant all on table public.notification_jobs to service_role;
grant all on table public.notification_deliveries to service_role;
grant all on table public.notification_templates to service_role;

create or replace function public.list_my_system_notifications(p_limit int default 50)
returns table (
  id uuid,
  notification_id uuid,
  title text,
  body text,
  href text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    d.id,
    d.notification_id,
    d.title,
    d.body,
    d.href,
    d.read_at,
    coalesce(d.sent_at, d.created_at) as sent_at,
    d.created_at
  from public.notification_deliveries d
  where d.user_id = auth.uid()
    and d.channel = 'in_app'
    and d.status = 'sent'
  order by coalesce(d.sent_at, d.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

create or replace function public.mark_my_system_notification_read(p_delivery_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.notification_deliveries
  set read_at = coalesce(read_at, now())
  where id = p_delivery_id
    and user_id = auth.uid()
    and channel = 'in_app'
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.mark_all_my_system_notifications_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.notification_deliveries
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and channel = 'in_app'
    and read_at is null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.admin_list_system_notifications(
  p_status text default null,
  p_limit int default 50
)
returns table (
  id uuid,
  title text,
  body text,
  href text,
  target_type text,
  target_value text,
  status text,
  channel_in_app boolean,
  channel_web_push boolean,
  target_count int,
  in_app_sent int,
  push_sent int,
  push_failed int,
  created_at timestamptz,
  sent_at timestamptz,
  scheduled_at timestamptz
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
    n.id,
    n.title,
    n.body,
    n.href,
    n.target_type,
    n.target_value,
    n.status,
    n.channel_in_app,
    n.channel_web_push,
    n.target_count,
    n.in_app_sent,
    n.push_sent,
    n.push_failed,
    n.created_at,
    n.sent_at,
    n.scheduled_at
  from public.system_notifications n
  where (p_status is null or n.status = p_status)
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

create or replace function public.admin_list_notification_deliveries(
  p_notification_id uuid default null,
  p_limit int default 100
)
returns table (
  id uuid,
  notification_id uuid,
  user_id uuid,
  user_email text,
  channel text,
  status text,
  error_message text,
  sent_at timestamptz,
  read_at timestamptz,
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
    d.id,
    d.notification_id,
    d.user_id,
    coalesce(d.user_email, p.email) as user_email,
    d.channel,
    d.status,
    d.error_message,
    d.sent_at,
    d.read_at,
    d.created_at
  from public.notification_deliveries d
  left join public.profiles p on p.id = d.user_id
  where (p_notification_id is null or d.notification_id = p_notification_id)
  order by d.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;

revoke all on function public.list_my_system_notifications(int) from public;
revoke all on function public.mark_my_system_notification_read(uuid) from public;
revoke all on function public.mark_all_my_system_notifications_read() from public;
revoke all on function public.admin_list_system_notifications(text, int) from public;
revoke all on function public.admin_list_notification_deliveries(uuid, int) from public;

grant execute on function public.list_my_system_notifications(int) to authenticated, service_role;
grant execute on function public.mark_my_system_notification_read(uuid) to authenticated, service_role;
grant execute on function public.mark_all_my_system_notifications_read() to authenticated, service_role;
grant execute on function public.admin_list_system_notifications(text, int) to authenticated, service_role;
grant execute on function public.admin_list_notification_deliveries(uuid, int) to authenticated, service_role;
