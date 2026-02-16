-- Automation run history for ingestion/splitwise cron and manual runs.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'automation_job_type') then
    create type automation_job_type as enum ('INGESTION', 'SPLITWISE');
  end if;
end $$;

create table if not exists automation_run_history (
  id uuid primary key default gen_random_uuid(),
  job_type automation_job_type not null,
  run_source text not null default 'UNKNOWN',
  status text not null default 'RUNNING',
  request_payload jsonb,
  summary jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_run_history_source_check
    check (run_source in ('GITHUB_CRON', 'ADMIN_MANUAL', 'API', 'UNKNOWN')),
  constraint automation_run_history_status_check
    check (status in ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'))
);

create index if not exists automation_run_history_job_started_idx
  on automation_run_history (job_type, started_at desc);

create index if not exists automation_run_history_source_started_idx
  on automation_run_history (run_source, started_at desc);

create index if not exists automation_run_history_status_started_idx
  on automation_run_history (status, started_at desc);

alter table automation_run_history enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'automation_run_history_set_updated_at'
  ) then
    create trigger automation_run_history_set_updated_at
    before update on automation_run_history
    for each row execute function set_updated_at();
  end if;
end $$;
