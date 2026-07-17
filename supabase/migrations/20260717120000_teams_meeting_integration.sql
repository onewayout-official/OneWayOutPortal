-- Teams meeting integration: store Outlook event ID for cancellation sync
alter table public.counselor_appointments
  add column if not exists outlook_event_id text;
