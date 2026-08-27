-- Member account status for suspend / reactivate (does not delete data)
alter table public.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active', 'suspended'));

create index if not exists profiles_status_idx on public.profiles (status);
