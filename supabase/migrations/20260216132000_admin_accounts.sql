create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  active boolean not null default true,
  session_version integer not null default 1,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists admin_users_username_ci_uidx
on admin_users (lower(username));

create index if not exists admin_users_active_idx
on admin_users (active)
where active = true;

alter table admin_users enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'admin_users_set_updated_at'
  ) then
    create trigger admin_users_set_updated_at
    before update on admin_users
    for each row execute function set_updated_at();
  end if;
end
$$;
