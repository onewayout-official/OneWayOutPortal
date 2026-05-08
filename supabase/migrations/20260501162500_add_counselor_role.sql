-- Extend profiles.role to include counselor.
update public.profiles
set role = 'user'
where role is null or role not in ('admin', 'user', 'counselor');

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'user', 'counselor'));
