-- Private coach notes per booked session (updated via coach API only)
alter table public.counselor_appointments
add column if not exists coach_notes text not null default '';
