-- Income (onboarding / registration income sources)
create table if not exists public.income (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  type text not null,
  name text not null default '',
  personal numeric not null default 0,
  spouse numeric not null default 0,
  points numeric not null default 0,
  editable boolean default true
);

-- Budget expenses (onboarding / registration expense categories - recurring budget items)
create table if not exists public.budget_expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  type text not null,
  name text not null default '',
  personal numeric not null default 0,
  spouse numeric not null default 0,
  points numeric not null default 0,
  editable boolean default true
);

alter table public.income enable row level security;
alter table public.budget_expenses enable row level security;

create policy "Users can manage own income"
  on public.income for all using (auth.uid() = user_id);

create policy "Users can manage own budget_expenses"
  on public.budget_expenses for all using (auth.uid() = user_id);
