-- Splitz Console Admin - Phase 11 release notes / in-app announcement.

create table public.release_notes (
  id              uuid primary key default gen_random_uuid(),
  version         text not null,
  title           text not null,
  body            text not null,
  status          text not null default 'draft' check (status in ('draft','published','cancelled')),
  audience        text not null default 'all' check (audience in ('all','free','premium')),
  href            text,
  notification_id uuid references public.system_notifications (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,
  published_by    uuid references public.profiles (id) on delete set null,
  cancelled_by    uuid references public.profiles (id) on delete set null,
  published_at    timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (length(trim(version)) > 0),
  check (length(trim(title)) > 0),
  check (length(trim(body)) > 0)
);

create index release_notes_status_idx on public.release_notes (status, updated_at desc);
create index release_notes_published_idx on public.release_notes (published_at desc nulls last);
create unique index release_notes_version_active_idx on public.release_notes (lower(version)) where status <> 'cancelled';

alter table public.release_notes enable row level security;
revoke all on table public.release_notes from anon, authenticated;
grant all on table public.release_notes to service_role;
