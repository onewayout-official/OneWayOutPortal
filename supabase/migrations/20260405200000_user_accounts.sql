-- User accounts: dynamic accounts created by the user (e.g. "FNB Cheque" of type "bank")
create table if not exists public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('bank', 'savings', 'investment', 'cash', 'wallet')),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.user_accounts enable row level security;

create policy "Users can manage their own accounts"
  on public.user_accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Migrate income_allocations: replace account_type with account_id
-- Drop old column + constraint, add new foreign key
alter table public.income_allocations
  add column account_id uuid references public.user_accounts(id) on delete cascade;

-- Drop the old account_type column (and its check constraint)
alter table public.income_allocations
  drop column account_type;
