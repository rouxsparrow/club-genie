alter table sessions
  add column if not exists payer_player_id uuid references players(id) on delete set null;

create index if not exists sessions_payer_player_id_idx
on sessions (payer_player_id);

do $$
declare
  v_default_payer_id uuid;
begin
  select id
  into v_default_payer_id
  from players
  where is_default_payer = true
  limit 1;

  if v_default_payer_id is null then
    raise exception 'missing_default_payer_for_backfill: set one players.is_default_payer=true before applying migration';
  end if;

  update sessions
  set payer_player_id = v_default_payer_id
  where payer_player_id is null;
end $$;

