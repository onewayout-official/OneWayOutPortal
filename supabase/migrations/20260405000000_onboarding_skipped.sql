-- Track users who chose to skip onboarding so they can access the app but see reminders to finish setup.
alter table public.profiles
  add column if not exists onboarding_skipped boolean not null default false;

comment on column public.profiles.onboarding_skipped is 'True when user chose Skip on onboarding; cleared when onboarding is completed.';
