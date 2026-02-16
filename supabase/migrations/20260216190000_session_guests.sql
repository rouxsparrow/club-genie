alter table sessions
  add column if not exists guest_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_guest_count_range_check'
  ) then
    alter table sessions
      add constraint sessions_guest_count_range_check
      check (guest_count >= 0 and guest_count <= 20);
  end if;
end
$$;
