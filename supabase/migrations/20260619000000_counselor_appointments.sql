-- Link counselor profiles to auth users (coach login accounts)
alter table public.counselors
add column if not exists linked_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists counselors_linked_user_id_unique
  on public.counselors (linked_user_id)
  where linked_user_id is not null;

-- Appointments booked by portal users with a coach
create table if not exists public.counselor_appointments (
  id uuid primary key default gen_random_uuid(),
  counselor_id text not null references public.counselors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  appointment_date date not null,
  appointment_time text not null,
  meeting_link text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists counselor_appointments_counselor_id_idx
  on public.counselor_appointments (counselor_id);

create index if not exists counselor_appointments_user_id_idx
  on public.counselor_appointments (user_id);

alter table public.counselor_appointments enable row level security;

-- Portal users can book and view their own appointments
create policy "appointments_insert_own"
  on public.counselor_appointments
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "appointments_select_own"
  on public.counselor_appointments
  for select
  to authenticated
  using (user_id = auth.uid());
