alter table public.profiles
  alter column user_points set default 100;

update public.profiles
set user_points = 100
where user_points is null;
