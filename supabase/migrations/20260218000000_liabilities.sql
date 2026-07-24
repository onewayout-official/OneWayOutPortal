-- Liabilities (onboarding / registration liabilities)
create table if not exists public.liabilities (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  type text not null,
  name text not null default '',
  personal numeric not null default 0,
  spouse numeric not null default 0,
  points numeric not null default 0,
  interest_rate numeric not null default 0,
  editable boolean default true
);

create index if not exists liabilities_user_id_idx on public.liabilities (user_id);

alter table public.liabilities enable row level security;

create policy "Users can manage own liabilities"
  on public.liabilities for all using (auth.uid() = user_id);

