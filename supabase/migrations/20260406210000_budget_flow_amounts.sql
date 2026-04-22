-- Persist amount-based budget flow values across devices

-- 1) Income -> Account transfer amount per income allocation
alter table public.income_allocations
  add column if not exists amount numeric not null default 0;

-- 2) Account -> Account transfer amounts
create table if not exists public.account_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.user_accounts(id) on delete cascade,
  to_account_id uuid not null references public.user_accounts(id) on delete cascade,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, from_account_id, to_account_id),
  check (from_account_id <> to_account_id)
);

alter table public.account_transfers enable row level security;

create policy "Users can manage their own account transfers"
  on public.account_transfers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

