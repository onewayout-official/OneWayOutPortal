-- Income allocations: tracks which account type each income item is assigned to
create table if not exists public.income_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  income_id text not null,
  account_type text not null check (account_type in ('bank', 'savings', 'investment', 'cash', 'wallet')),
  created_at timestamptz not null default now(),
  unique (user_id, income_id)
);

alter table public.income_allocations enable row level security;

create policy "Users can manage their own income allocations"
  on public.income_allocations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
