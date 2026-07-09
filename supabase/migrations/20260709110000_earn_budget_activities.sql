-- Activity tracking tables backing the Dashboard calendar rings.
-- These were referenced by lib/storage.ts (logEarnActivity / logBudgetActivity
-- and getDashboardData) but never created, so Earn/Budget days never lit up.

-- Earn activities: one row per user per day the user completed an earn task
create table if not exists public.earn_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);

-- Budget activities: one row per user per day the user updated their budget
create table if not exists public.budget_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);

alter table public.earn_activities enable row level security;
alter table public.budget_activities enable row level security;

create policy "Users can manage own earn_activities"
  on public.earn_activities for all using (auth.uid() = user_id);

create policy "Users can manage own budget_activities"
  on public.budget_activities for all using (auth.uid() = user_id);
