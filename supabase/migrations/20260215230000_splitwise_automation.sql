-- Splitwise automation schema:
-- - sessions.splitwise_status
-- - players.splitwise_user_id + is_default_payer (single payer constraint)
-- - splitwise_settings singleton table
-- - expenses status + payload/error fields for idempotent retries

do $$
begin
  if not exists (select 1 from pg_type where typname = 'splitwise_status') then
    create type splitwise_status as enum ('PENDING', 'CREATED', 'FAILED');
  end if;

  if not exists (select 1 from pg_type where typname = 'expense_status') then
    create type expense_status as enum ('PENDING', 'CREATED', 'FAILED');
  end if;
end $$;

alter table sessions
  add column if not exists splitwise_status splitwise_status not null default 'PENDING';

alter table players
  add column if not exists splitwise_user_id int,
  add column if not exists is_default_payer boolean not null default false;

create unique index if not exists players_single_default_payer_idx
on players (is_default_payer)
where is_default_payer;

create table if not exists splitwise_settings (
  id int primary key default 1 check (id = 1),
  group_id int not null default 0,
  currency_code text not null default 'SGD',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table splitwise_settings enable row level security;

insert into splitwise_settings (id)
values (1)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'splitwise_settings_set_updated_at'
  ) then
    create trigger splitwise_settings_set_updated_at
    before update on splitwise_settings
    for each row execute function set_updated_at();
  end if;
end $$;

alter table expenses
  add column if not exists status expense_status not null default 'PENDING',
  add column if not exists last_error text,
  add column if not exists request_payload jsonb,
  add column if not exists response_payload jsonb,
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'expenses_set_updated_at'
  ) then
    create trigger expenses_set_updated_at
    before update on expenses
    for each row execute function set_updated_at();
  end if;
end $$;

