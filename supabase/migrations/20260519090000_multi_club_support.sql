-- Multi-club support: clubs, per-club tokens, memberships, and per-club Splitwise settings.
-- Backfills existing single-club data into a "Default Club".

-- 1) Core club tables
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clubs_name_ci_uidx
on clubs (lower(name));

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'clubs_set_updated_at'
  ) then
    create trigger clubs_set_updated_at
    before update on clubs
    for each row execute function set_updated_at();
  end if;
end $$;

alter table clubs enable row level security;

create table if not exists club_tokens (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  token_hash text not null,
  token_value text,
  token_version int not null default 1,
  is_current boolean not null default true,
  rotated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists club_tokens_one_current_per_club_uidx
on club_tokens (club_id)
where is_current = true;

create index if not exists club_tokens_current_hash_idx
on club_tokens (token_hash)
where is_current = true;

alter table club_tokens enable row level security;

create table if not exists club_players (
  club_id uuid not null references clubs(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  active boolean not null default true,
  is_default_payer boolean not null default false,
  shuttlecock_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (club_id, player_id)
);

create unique index if not exists club_players_one_default_payer_per_club_uidx
on club_players (club_id)
where is_default_payer = true;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'club_players_set_updated_at'
  ) then
    create trigger club_players_set_updated_at
    before update on club_players
    for each row execute function set_updated_at();
  end if;
end $$;

alter table club_players enable row level security;

create table if not exists club_splitwise_settings (
  club_id uuid primary key references clubs(id) on delete cascade,
  group_id int not null default 0,
  currency_code text not null default 'SGD',
  enabled boolean not null default true,
  shuttlecock_fee numeric(10,2) not null default 4.00,
  court_conversion_fee_percent numeric(10,2) not null default 1.00,
  description_template text not null default 'Badminton {session_date} - {location}',
  date_format text not null default 'DD/MM/YY',
  location_replacements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'club_splitwise_settings_set_updated_at'
  ) then
    create trigger club_splitwise_settings_set_updated_at
    before update on club_splitwise_settings
    for each row execute function set_updated_at();
  end if;
end $$;

alter table club_splitwise_settings enable row level security;

-- 2) Add club_id columns to existing tables (nullable first for backfill)
alter table sessions
  add column if not exists club_id uuid;

alter table email_receipts
  add column if not exists club_id uuid;

alter table automation_settings
  add column if not exists ingestion_club_id uuid;

-- 3) Backfill Default Club + relationships
do $$
declare
  v_default_club_id uuid;
  v_latest_token_version int;
  v_latest_created_at timestamptz;
begin
  -- Create default club if missing.
  select id into v_default_club_id
  from clubs
  where lower(name) = lower('Default Club')
  limit 1;

  if v_default_club_id is null then
    insert into clubs (name)
    values ('Default Club')
    returning id into v_default_club_id;
  end if;

  -- Backfill sessions/email_receipts club_id.
  update sessions set club_id = v_default_club_id where club_id is null;
  update email_receipts set club_id = v_default_club_id where club_id is null;

  -- Set ingestion club id (single-club ingestion for now).
  update automation_settings
  set ingestion_club_id = v_default_club_id
  where id = 1 and ingestion_club_id is null;

  -- Seed club_players from players (keep player identity global).
  insert into club_players (club_id, player_id, active, is_default_payer, shuttlecock_paid)
  select
    v_default_club_id,
    p.id,
    coalesce(p.active, true),
    coalesce(p.is_default_payer, false),
    coalesce(p.shuttlecock_paid, false)
  from players p
  on conflict (club_id, player_id) do nothing;

  -- Seed club splitwise settings from existing singleton splitwise_settings if present.
  if exists (select 1 from information_schema.tables where table_name = 'splitwise_settings') then
    insert into club_splitwise_settings (
      club_id, group_id, currency_code, enabled, shuttlecock_fee, court_conversion_fee_percent,
      description_template, date_format, location_replacements, updated_at
    )
    select
      v_default_club_id,
      coalesce(s.group_id, 0),
      coalesce(nullif(btrim(s.currency_code), ''), 'SGD'),
      coalesce(s.enabled, true),
      coalesce(s.shuttlecock_fee, 4.00),
      coalesce(s.court_conversion_fee_percent, 1.00),
      coalesce(nullif(btrim(s.description_template), ''), 'Badminton {session_date} - {location}'),
      coalesce(nullif(btrim(s.date_format), ''), 'DD/MM/YY'),
      coalesce(s.location_replacements, '[]'::jsonb),
      now()
    from splitwise_settings s
    where s.id = 1
    on conflict (club_id) do nothing;
  end if;

  -- Backfill club tokens from existing club_settings if present.
  if exists (select 1 from information_schema.tables where table_name = 'club_settings') then
    insert into club_tokens (club_id, token_hash, token_value, token_version, is_current, rotated_at, created_at)
    select
      v_default_club_id,
      cs.token_hash,
      cs.token_value,
      cs.token_version,
      false,
      cs.rotated_at,
      cs.created_at
    from club_settings cs
    on conflict do nothing;

    -- Mark latest token as current.
    select max(token_version) into v_latest_token_version from club_settings;
    if v_latest_token_version is null then
      -- Fallback to created_at if no versions somehow.
      select max(created_at) into v_latest_created_at from club_settings;
      update club_tokens
      set is_current = true
      where club_id = v_default_club_id
        and created_at = v_latest_created_at;
    else
      update club_tokens
      set is_current = true
      where club_id = v_default_club_id
        and token_version = v_latest_token_version;
    end if;
  end if;

  -- Ensure settings row exists even if splitwise_settings missing.
  insert into club_splitwise_settings (club_id)
  values (v_default_club_id)
  on conflict (club_id) do nothing;
end $$;

-- 4) Enforce not-null club_id after backfill
alter table sessions
  alter column club_id set not null;

alter table email_receipts
  alter column club_id set not null;

-- 5) Replace single-club uniqueness with per-club uniqueness.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'sessions_session_date_key'
      and conrelid = 'sessions'::regclass
  ) then
    alter table sessions drop constraint sessions_session_date_key;
  end if;
end $$;

create unique index if not exists sessions_club_id_session_date_uidx
on sessions (club_id, session_date);
