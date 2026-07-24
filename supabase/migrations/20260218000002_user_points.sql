-- Add user_points to profiles for earn/redeem points
alter table public.profiles
  add column if not exists user_points numeric not null default 0;
