-- Normalize existing phone values (trim, remove spaces) before uniqueness check
update public.profiles
set phone = regexp_replace(trim(phone), '\s+', '', 'g')
where phone is not null
  and phone <> ''
  and phone <> regexp_replace(trim(phone), '\s+', '', 'g');

-- Resolve duplicates: keep the earliest profile per phone, clear phone on the rest
with ranked as (
  select
    id,
    row_number() over (
      partition by phone
      order by created_at asc nulls last, id asc
    ) as rn
  from public.profiles
  where phone is not null and phone <> ''
)
update public.profiles p
set phone = null
from ranked r
where p.id = r.id
  and r.rn > 1;

-- Enforce unique phone numbers on profiles (when set)
create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null and phone <> '';

-- OTP codes for WhatsApp login (server-managed, hashed at rest)
create table if not exists public.phone_otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists phone_otp_codes_phone_expires_idx
  on public.phone_otp_codes (phone, expires_at desc);

-- Only service role should access OTP table
alter table public.phone_otp_codes enable row level security;

-- No policies: clients cannot read/write OTP codes directly
