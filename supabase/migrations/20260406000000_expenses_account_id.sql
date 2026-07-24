-- Link expenses to a specific user account (optional; NULL = unlinked)
alter table public.expenses
  add column if not exists account_id uuid references public.user_accounts(id) on delete set null;
