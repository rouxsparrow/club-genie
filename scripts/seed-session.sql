insert into sessions (session_date, status, start_time, end_time, total_fee)
values (
  current_date,
  'OPEN',
  now() + interval '2 hours',
  now() + interval '4 hours',
  100.00
)
returning id;
