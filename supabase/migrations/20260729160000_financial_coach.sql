-- Dedicated financial coach (hidden from the public Help Me directory)
alter table public.counselors
add column if not exists is_financial_coach boolean not null default false;

-- Public counselor listing must exclude financial coaches
drop policy if exists "counselors_select_active" on public.counselors;

create policy "counselors_select_active"
  on public.counselors
  for select
  to authenticated
  using (is_active = true and is_financial_coach = false);
