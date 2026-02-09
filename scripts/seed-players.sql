insert into players (name) values
  ('Alex'),
  ('Jordan'),
  ('Sam'),
  ('Taylor')
on conflict (name) do nothing;
