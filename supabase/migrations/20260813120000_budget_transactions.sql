-- Append-only ledger for Budget income/expense money events (mirrors reward_transactions)

create table if not exists public.budget_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'income_defined',
    'expense_defined',
    'income_to_account',
    'account_to_expense',
    'account_to_account',
    'income_allocation_cleared',
    'expense_allocation_cleared',
    'account_transfer_cleared',
    'spend_logged'
  )),
  amount numeric not null check (amount >= 0),
  title text not null default '',
  category text,
  from_account_id uuid references public.user_accounts(id) on delete set null,
  to_account_id uuid references public.user_accounts(id) on delete set null,
  income_id uuid,
  expense_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists budget_transactions_user_created_idx
  on public.budget_transactions (user_id, created_at desc);

alter table public.budget_transactions enable row level security;

create policy "Users can read own budget_transactions"
  on public.budget_transactions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own budget_transactions"
  on public.budget_transactions
  for insert
  with check (auth.uid() = user_id);
