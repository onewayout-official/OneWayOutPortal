import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  computeCoachAvailability,
  isValidAvailabilityDate,
  type AvailabilitySlot,
} from "@/lib/coachAvailability";
import {
  getCoachBusyIntervals,
  getMeetingTimezone,
  isMicrosoftGraphConfigured,
} from "@/lib/microsoftGraph";

export async function createAdminClient(): Promise<SupabaseClient | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function resolveCoachMailboxEmail(
  adminClient: SupabaseClient,
  linkedUserId?: string | null
): Promise<string | null> {
  if (!linkedUserId) return null;

  const { data } = await adminClient
    .from("profiles")
    .select("email")
    .eq("id", linkedUserId)
    .maybeSingle();

  const email = (data as { email?: string | null } | null)?.email?.trim();
  return email || null;
}

export async function loadCoachAvailability({
  adminClient,
  counselorId,
  from,
  to,
}: {
  adminClient: SupabaseClient;
  counselorId: string;
  from: string;
  to: string;
}): Promise<{
  slots: AvailabilitySlot[];
  coachEmail: string | null;
  graphSynced: boolean;
} | null> {
  const { data: counselor, error: counselorError } = await adminClient
    .from("counselors")
    .select("id, availability, linked_user_id")
    .eq("id", counselorId)
    .eq("is_active", true)
    .maybeSingle();

  if (counselorError) {
    throw new Error(counselorError.message);
  }

  if (!counselor) {
    return null;
  }

  const availability = ((counselor as { availability?: string[] }).availability ?? []).map(
    (slot) => slot.trim()
  );

  const coachEmail = await resolveCoachMailboxEmail(
    adminClient,
    (counselor as { linked_user_id?: string | null }).linked_user_id
  );

  const { data: bookedRows, error: bookedError } = await adminClient
    .from("counselor_appointments")
    .select("appointment_date, appointment_time")
    .eq("counselor_id", counselorId)
    .eq("status", "scheduled")
    .gte("appointment_date", from)
    .lte("appointment_date", to);

  if (bookedError) {
    throw new Error(bookedError.message);
  }

  const bookedSlots = (bookedRows ?? []).map((row) => ({
    date: (row as { appointment_date: string }).appointment_date,
    time: (row as { appointment_time: string }).appointment_time,
  }));

  let busyIntervals: Awaited<ReturnType<typeof getCoachBusyIntervals>> = [];
  let graphSynced = false;

  if (coachEmail && isMicrosoftGraphConfigured()) {
    try {
      const timeZone = getMeetingTimezone();
      busyIntervals = await getCoachBusyIntervals(
        coachEmail,
        `${from}T00:00:00`,
        `${to}T23:59:59`,
        timeZone
      );
      graphSynced = true;
    } catch (error) {
      console.error("Failed to load Outlook busy intervals:", error);
    }
  }

  const slots = computeCoachAvailability({
    availability,
    from,
    to,
    bookedSlots,
    busyIntervals,
  });

  return { slots, coachEmail, graphSynced };
}

export function validateAvailabilityRange(from: string, to: string): boolean {
  return isValidAvailabilityDate(from) && isValidAvailabilityDate(to) && from <= to;
}
