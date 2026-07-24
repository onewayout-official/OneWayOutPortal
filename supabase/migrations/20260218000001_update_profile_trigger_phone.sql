-- Update profile trigger to include phone number from auth.users (phone OTP signup has null email)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    coalesce(new.phone, null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Ensure trigger exists (safe if already created by initial_schema)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
