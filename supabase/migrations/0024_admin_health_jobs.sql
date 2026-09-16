-- Splitz Console Admin - Phase 5 system health and admin job runs.
-- Health checks mutate only admin-operational tables, never user business data.

create table public.admin_job_runs (
  id             uuid primary key default gen_random_uuid(),
  job_type       text not null check (length(trim(job_type)) > 0),
  source         text not null default 'console' check (length(trim(source)) > 0),
  status         text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  target_type    text,
  target_id      text,
  summary        text,
  payload        jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  error_message  text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  finished_at    timestamptz
);

create index admin_job_runs_created_idx on public.admin_job_runs (created_at desc);
create index admin_job_runs_status_idx on public.admin_job_runs (status, created_at desc);
create index admin_job_runs_type_idx on public.admin_job_runs (job_type, created_at desc);

alter table public.admin_job_runs enable row level security;

-- Hidden from client roles. Console reads this through guarded Edge Functions/RPC only.
revoke all on table public.admin_job_runs from anon, authenticated;
grant all on table public.admin_job_runs to service_role;
