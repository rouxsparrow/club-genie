alter table sessions
  add column if not exists location text,
  add column if not exists remarks text;
