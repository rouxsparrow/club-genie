# Seed Players (Temporary)

Run in Supabase SQL editor:

```sql
insert into players (name) values
  ('Alex'),
  ('Jordan'),
  ('Sam'),
  ('Taylor')
on conflict (name) do nothing;
```

Use `scripts/test-list-players.sh` to confirm IDs.
