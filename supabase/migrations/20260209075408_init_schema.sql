-- Initial schema for club-genie

create type session_status as enum ('DRAFT', 'OPEN', 'CLOSED');

create table if not exists club_settings (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  token_version int not null default 1,
  rotated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null unique,
  status session_status not null default 'DRAFT',
  start_time timestamptz,
  end_time timestamptz,
  total_fee numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists courts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  court_label text,
  start_time timestamptz,
  end_time timestamptz
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  created_at timestamptz default now(),
  unique (session_id, player_id)
);

create table if not exists email_receipts (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  received_at timestamptz,
  raw_html text,
  parse_status text not null default 'PENDING',
  parse_error text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  splitwise_expense_id text,
  amount numeric(10,2),
  created_at timestamptz default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sessions_set_updated_at
before update on sessions
for each row execute function set_updated_at();

alter table club_settings enable row level security;
alter table sessions enable row level security;
alter table courts enable row level security;
alter table players enable row level security;
alter table session_participants enable row level security;
alter table email_receipts enable row level security;
alter table expenses enable row level security;

-- No public policies; access is via Edge Functions using service role.
