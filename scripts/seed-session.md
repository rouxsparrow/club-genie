# Seed Session (Temporary)

1) Open Supabase SQL editor.
2) Run:

```sql
insert into sessions (session_date, status, start_time, end_time, total_fee)
values (
  current_date,
  'OPEN',
  now() + interval '2 hours',
  now() + interval '4 hours',
  100.00
)
returning id;
```

3) Copy the returned `id` and run:

```bash
./scripts/test-get-session.sh <CLUB_TOKEN> <SESSION_ID>
```
