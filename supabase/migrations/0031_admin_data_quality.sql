-- Splitz Console Admin - Phase 12 data quality scanner metadata.
-- Scanner results are admin metadata only; no business cleanup is performed here.

create table public.admin_data_quality_scans (
  id            uuid primary key default gen_random_uuid(),
  checked_at    timestamptz not null default now(),
  total_issues  int not null default 0 check (total_issues >= 0),
  critical      int not null default 0 check (critical >= 0),
  warning       int not null default 0 check (warning >= 0),
  info          int not null default 0 check (info >= 0),
  scanners_run  int not null default 0 check (scanners_run >= 0),
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_email   text,
  actor_role    text check (actor_role in ('owner','operator','support','readonly'))
);

create table public.admin_data_quality_issues (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid not null references public.admin_data_quality_scans (id) on delete cascade,
  issue_key   text not null,
  scanner     text not null check (length(trim(scanner)) > 0),
  severity    text not null check (severity in ('critical','warning','info')),
  title       text not null check (length(trim(title)) > 0),
  detail      text,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  status      text not null default 'open' check (status in ('open','resolved','ignored')),
  detected_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index admin_data_quality_scans_checked_idx on public.admin_data_quality_scans (checked_at desc);
create index admin_data_quality_issues_scan_idx on public.admin_data_quality_issues (scan_id, severity, scanner);
create index admin_data_quality_issues_target_idx on public.admin_data_quality_issues (target_type, target_id);
create index admin_data_quality_issues_key_idx on public.admin_data_quality_issues (issue_key, created_at desc);

alter table public.admin_data_quality_scans enable row level security;
alter table public.admin_data_quality_issues enable row level security;

revoke all on table public.admin_data_quality_scans from anon, authenticated;
revoke all on table public.admin_data_quality_issues from anon, authenticated;

grant all on table public.admin_data_quality_scans to service_role;
grant all on table public.admin_data_quality_issues to service_role;
