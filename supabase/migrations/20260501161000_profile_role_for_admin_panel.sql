-- Add role support for admin panel permissions.
alter table public.profiles
add column if not exists role text not null default 'user';

-- Normalize any unexpected values.
update public.profiles
set role = 'user'
where role is null or role not in ('admin', 'user');

-- Restrict role values to expected enum-like set.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'user'));
  end if;
end $$;
