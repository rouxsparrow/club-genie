alter table splitwise_settings
  add column if not exists description_template text not null default 'Badminton {session_date} - {location}';

