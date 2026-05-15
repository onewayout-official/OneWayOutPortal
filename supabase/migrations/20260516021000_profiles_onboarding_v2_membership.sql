alter table public.profiles
  add column if not exists membership text not null default 'Debt Crusher',
  add column if not exists onboarding_step int not null default 1,
  add column if not exists onboarding_mood text,
  add column if not exists debt_status text,
  add column if not exists savings_status text,
  add column if not exists investment_status text,
  add column if not exists income_stability text,
  add column if not exists emergency_resilience text,
  add column if not exists primary_goal text;

update public.profiles
set membership = 'Debt Crusher'
where membership is null or membership = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_membership_check'
  ) then
    alter table public.profiles
      add constraint profiles_membership_check
      check (membership in ('Debt Crusher', 'Cash King', 'Wealth Creator', 'Legacy Builder'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_onboarding_step_check'
  ) then
    alter table public.profiles
      add constraint profiles_onboarding_step_check
      check (onboarding_step between 1 and 7);
  end if;
end $$;
