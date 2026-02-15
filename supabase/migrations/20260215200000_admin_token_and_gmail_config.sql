alter table club_settings
  add column if not exists token_value text;

create table if not exists gmail_oauth_config (
  id int primary key default 1 check (id = 1),
  client_id text not null default '',
  client_secret text not null default '',
  refresh_token text not null default '',
  updated_at timestamptz not null default now()
);

alter table gmail_oauth_config enable row level security;

insert into gmail_oauth_config (id)
values (1)
on conflict (id) do nothing;
