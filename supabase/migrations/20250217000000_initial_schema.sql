-- Profiles: one per user (auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  phone text,
  monthly_income numeric not null default 0,
  savings_goal numeric,
  created_at timestamptz not null default now(),
  mood text,
  capital numeric,
  debts numeric,
  last_income numeric,
  last_expenses numeric,
  income_goals numeric,
  saving_goals numeric,
  onboarding_completed boolean default false
);

-- Expenses
create table if not exists public.expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric not null,
  category text not null,
  date date not null,
  description text,
  created_at timestamptz default now()
);

-- Debts
create table if not exists public.debts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_amount numeric not null,
  remaining_amount numeric not null,
  interest_rate numeric not null,
  minimum_payment numeric not null,
  due_date date not null,
  type text not null,
  created_at timestamptz not null default now()
);

-- Assets
create table if not exists public.assets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  type text not null,
  name text not null,
  personal numeric not null default 0,
  spouse numeric not null default 0,
  points numeric not null default 0,
  interest_rate numeric not null default 0,
  editable boolean default true
);

-- Daily moods: one row per user per day
create table if not exists public.daily_moods (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood text not null,
  primary key (user_id, date)
);

-- Onboarding data (income, expenses, assets, liabilities as JSONB)
create table if not exists public.onboarding_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  income jsonb not null default '[]',
  expenses jsonb not null default '[]',
  assets jsonb not null default '[]',
  liabilities jsonb not null default '[]'
);

-- RLS: enable and policies so users only see their own data
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.assets enable row level security;
alter table public.daily_moods enable row level security;
alter table public.onboarding_data enable row level security;

create policy "Users can manage own profile"
  on public.profiles for all using (auth.uid() = id);

create policy "Users can manage own expenses"
  on public.expenses for all using (auth.uid() = user_id);

create policy "Users can manage own debts"
  on public.debts for all using (auth.uid() = user_id);

create policy "Users can manage own assets"
  on public.assets for all using (auth.uid() = user_id);

create policy "Users can manage own daily_moods"
  on public.daily_moods for all using (auth.uid() = user_id);

create policy "Users can manage own onboarding_data"
  on public.onboarding_data for all using (auth.uid() = user_id);

-- Optional: create profile automatically on signup (trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
