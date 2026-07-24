with ranked_scheduled_slots as (
  select
    id,
    row_number() over (
      partition by counselor_id, appointment_date, appointment_time
      order by created_at asc, id asc
    ) as slot_rank
  from public.counselor_appointments
  where status = 'scheduled'
)
update public.counselor_appointments appointments
set status = 'cancelled'
from ranked_scheduled_slots ranked
where appointments.id = ranked.id
  and ranked.slot_rank > 1;

create unique index if not exists counselor_appointments_unique_scheduled_slot
  on public.counselor_appointments (counselor_id, appointment_date, appointment_time)
  where status = 'scheduled';

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'counselor_appointments'
      and policyname = 'appointments_update_own_scheduled'
  ) then
    create policy "appointments_update_own_scheduled"
      on public.counselor_appointments
      for update
      to authenticated
      using (user_id = auth.uid() and status = 'scheduled')
      with check (user_id = auth.uid());
  end if;
end $$;
