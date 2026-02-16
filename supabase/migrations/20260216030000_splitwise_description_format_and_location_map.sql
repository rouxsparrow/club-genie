alter table splitwise_settings
  add column if not exists date_format text not null default 'DD/MM/YY',
  add column if not exists location_replacements jsonb not null default '[]'::jsonb;

