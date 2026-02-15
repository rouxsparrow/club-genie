alter table email_receipts
  add column if not exists parsed_location text;

create index if not exists email_receipts_success_date_location_idx
on email_receipts (parsed_session_date, parsed_location)
where parse_status = 'SUCCESS';
