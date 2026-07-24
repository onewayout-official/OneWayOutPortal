import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  appointmentConfirmationEmail,
  coachBookingNotificationEmail,
} from "@/lib/emailTemplates";
import { createClient } from "@supabase/supabase-js";
import { appointmentFromRow, type CounselorAppointmentRow } from "@/lib/counselors";
import { isSlotAvailable } from "@/lib/coachAvailability";
import {
  loadCoachAvailability,
  validateAvailabilityRange,
} from "@/lib/coachBooking";
import { createCoachTeamsMeeting } from "@/lib/microsoftGraph";

async function getAuthenticatedUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: "Supabase not configured." }, { status: 500 }) };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Missing auth token." }, { status: 401 }) };
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return { adminClient, user };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function slotKey(date: string, time: string) {
  return `${date}|${time}`;
}

type CounselorSummaryRow = {
  id: string;
  name?: string | null;
  title?: string | null;
  specialty?: string | null;
  image?: string | null;
  location?: string | null;
};

type UserAppointmentRow = CounselorAppointmentRow & {
  counselors?: CounselorSummaryRow | CounselorSummaryRow[] | null;
};

function getCounselorSummary(row: UserAppointmentRow): CounselorSummaryRow | undefined {
  const counselor = row.counselors;
  if (Array.isArray(counselor)) {
    return counselor[0];
  }
  return counselor ?? undefined;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const counselorId = (searchParams.get("counselorId") ?? "").trim();
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();

  if (counselorId) {
    const query = auth.adminClient!
      .from("counselor_appointments")
      .select(
        "id, counselor_id, user_id, appointment_date, appointment_time, meeting_link, outlook_event_id, status, created_at"
      )
      .eq("counselor_id", counselorId)
      .eq("status", "scheduled")
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (from && isValidDate(from)) {
      query.gte("appointment_date", from);
    }
    if (to && isValidDate(to)) {
      query.lte("appointment_date", to);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as CounselorAppointmentRow[];
    return NextResponse.json({
      bookedSlots: rows.map((row) => ({
        id: row.id,
        date: row.appointment_date,
        time: row.appointment_time,
        key: slotKey(row.appointment_date, row.appointment_time),
      })),
    });
  }

  const { data, error } = await auth.adminClient!
    .from("counselor_appointments")
    .select("*, counselors(id, name, title, specialty, image, location)")
    .eq("user_id", auth.user!.id)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appointments = ((data ?? []) as UserAppointmentRow[]).map((row) =>
    appointmentFromRow(row, undefined, getCounselorSummary(row))
  );

  return NextResponse.json({ appointments });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth && auth.error) return auth.error;

  const body = (await request.json()) as {
    counselorId?: string;
    appointmentDate?: string;
    appointmentTime?: string;
  };

  const counselorId = (body.counselorId ?? "").trim();
  const appointmentDate = (body.appointmentDate ?? "").trim();
  const appointmentTime = (body.appointmentTime ?? "").trim();

  if (!counselorId || !appointmentDate || !appointmentTime) {
    return NextResponse.json(
      { error: "Counselor, date, and time are required." },
      { status: 400 }
    );
  }

  if (!isValidDate(appointmentDate) || !TIME_PATTERN.test(appointmentTime)) {
    return NextResponse.json({ error: "Choose a valid appointment date and time." }, { status: 400 });
  }

  if (!validateAvailabilityRange(appointmentDate, appointmentDate)) {
    return NextResponse.json({ error: "Choose a valid appointment date." }, { status: 400 });
  }

  const { data: counselor, error: counselorError } = await auth.adminClient!
    .from("counselors")
    .select("id, name, linked_user_id")
    .eq("id", counselorId)
    .eq("is_active", true)
    .maybeSingle();

  if (counselorError) {
    return NextResponse.json({ error: counselorError.message }, { status: 500 });
  }

  if (!counselor) {
    return NextResponse.json({ error: "Counselor not found or inactive." }, { status: 404 });
  }

  let availabilityResult;
  try {
    availabilityResult = await loadCoachAvailability({
      adminClient: auth.adminClient!,
      counselorId,
      from: appointmentDate,
      to: appointmentDate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate availability.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!availabilityResult) {
    return NextResponse.json({ error: "Counselor not found or inactive." }, { status: 404 });
  }

  if (!isSlotAvailable(availabilityResult.slots, appointmentDate, appointmentTime)) {
    return NextResponse.json(
      { error: "This time is no longer available. Please choose another slot." },
      { status: 409 }
    );
  }

  const coachName = (counselor as { name?: string }).name ?? "your coach";
  const coachEmail = availabilityResult.coachEmail;

  const { data: userProfile } = await auth.adminClient!
    .from("profiles")
    .select("name, first_name")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const userName =
    (userProfile as { name?: string; first_name?: string } | null)?.first_name ||
    (userProfile as { name?: string } | null)?.name ||
    "Client";

  let generatedMeetingLink = "";
  let outlookEventId: string | null = null;

  if (coachEmail) {
    try {
      const teamsMeeting = await createCoachTeamsMeeting({
        coachEmail,
        appointmentDate,
        appointmentTime,
        coachName,
        userName,
        userEmail: auth.user!.email ?? null,
      });
      if (teamsMeeting) {
        generatedMeetingLink = teamsMeeting.meetingLink;
        outlookEventId = teamsMeeting.eventId;
      }
    } catch (error) {
      console.error("Failed to create Teams meeting:", error);
    }
  }

  const { data, error } = await auth.adminClient!
    .from("counselor_appointments")
    .insert({
      counselor_id: counselorId,
      user_id: auth.user!.id,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      meeting_link: generatedMeetingLink,
      outlook_event_id: outlookEventId,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This slot was just booked. Please choose another time." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (isEmailConfigured()) {
    const userEmail = auth.user!.email;
    if (userEmail) {
      const userTemplate = appointmentConfirmationEmail({
        userName,
        coachName,
        appointmentDate,
        appointmentTime,
        meetingLink: generatedMeetingLink,
      });
      const userSend = await sendEmail({
        to: userEmail,
        subject: userTemplate.subject,
        html: userTemplate.html,
        text: userTemplate.text,
      });
      if (!userSend.success) {
        console.error("User confirmation email failed:", userSend.error);
      }
    }

    if (coachEmail) {
      const coachTemplate = coachBookingNotificationEmail({
        coachName,
        userName,
        userEmail: auth.user!.email ?? null,
        appointmentDate,
        appointmentTime,
        meetingLink: generatedMeetingLink,
      });
      const coachSend = await sendEmail({
        to: coachEmail,
        subject: coachTemplate.subject,
        html: coachTemplate.html,
        text: coachTemplate.text,
      });
      if (!coachSend.success) {
        console.error("Coach notification email failed:", coachSend.error);
      }
    }
  }

  return NextResponse.json(
    { appointment: appointmentFromRow(data as CounselorAppointmentRow) },
    { status: 201 }
  );
}
