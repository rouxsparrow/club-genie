create table if not exists automation_settings (
  id int primary key default 1 check (id = 1),
  subject_keywords text[] not null default array['Playtomic', 'Receipt'],
  timezone text not null default 'Asia/Singapore',
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into automation_settings (id)
values (1)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'automation_settings_set_updated_at'
  ) then
    create trigger automation_settings_set_updated_at
    before update on automation_settings
    for each row execute function set_updated_at();
  end if;
end $$;

alter table automation_settings enable row level security;

alter table email_receipts
  add column if not exists parsed_session_date date,
  add column if not exists parsed_total_fee numeric(10,2),
  add column if not exists parsed_courts jsonb;

create index if not exists email_receipts_success_session_date_idx
on email_receipts (parsed_session_date)
where parse_status = 'SUCCESS';
