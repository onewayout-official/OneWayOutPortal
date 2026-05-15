alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '';

-- Backfill first/last names for existing rows using the legacy "name" field.
update public.profiles
set
  first_name = case
    when btrim(first_name) = '' then split_part(btrim(name), ' ', 1)
    else first_name
  end,
  last_name = case
    when btrim(last_name) = '' then coalesce(nullif(regexp_replace(btrim(name), '^\S+\s*', ''), ''), '')
    else last_name
  end;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, first_name, last_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.raw_user_meta_data->>'name', ''), ' ', 1)),
    coalesce(new.raw_user_meta_data->>'last_name', regexp_replace(coalesce(new.raw_user_meta_data->>'name', ''), '^\S+\s*', '')),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone, null)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
