-- Tracks how much a user allocates from a specific account toward a planned expense category
create table if not exists public.account_expense_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.user_accounts(id) on delete cascade,
  expense_id text not null,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, account_id, expense_id)
);

alter table public.account_expense_allocations enable row level security;

create policy "Users can manage their own expense allocations"
  on public.account_expense_allocations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
