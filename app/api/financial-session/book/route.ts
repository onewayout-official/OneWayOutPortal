import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  appointmentConfirmationEmail,
  coachBookingNotificationEmail,
} from "@/lib/emailTemplates";
import { loadCoachAvailability } from "@/lib/coachBooking";
import { isSlotAvailable } from "@/lib/coachAvailability";
import { createCoachTeamsMeeting } from "@/lib/microsoftGraph";

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

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
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
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    appointmentDate?: string;
    appointmentTime?: string;
  };

  const appointmentDate = (body.appointmentDate ?? "").trim();
  const appointmentTime = (body.appointmentTime ?? "").trim();

  if (!appointmentDate || !appointmentTime) {
    return NextResponse.json(
      { error: "Date and time are required." },
      { status: 400 }
    );
  }

  if (!isValidDate(appointmentDate) || !TIME_PATTERN.test(appointmentTime)) {
    return NextResponse.json(
      { error: "Choose a valid appointment date and time." },
      { status: 400 }
    );
  }

  const { data: coach, error: coachError } = await adminClient
    .from("counselors")
    .select("id, name, linked_user_id")
    .eq("is_financial_coach", true)
    .eq("is_active", true)
    .maybeSingle();

  if (coachError) {
    return NextResponse.json({ error: coachError.message }, { status: 500 });
  }

  if (!coach) {
    return NextResponse.json(
      {
        error:
          'Financial coach is not configured. In Admin → Coaches, edit the coach and enable "Financial coach".',
      },
      { status: 404 }
    );
  }

  const counselorId = (coach as { id: string }).id;
  const coachName = (coach as { name?: string }).name ?? "your financial coach";

  let availabilityResult;
  try {
    availabilityResult = await loadCoachAvailability({
      adminClient,
      counselorId,
      from: appointmentDate,
      to: appointmentDate,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to validate availability.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!availabilityResult) {
    return NextResponse.json(
      { error: "Financial coach is not configured." },
      { status: 404 }
    );
  }

  if (!isSlotAvailable(availabilityResult.slots, appointmentDate, appointmentTime)) {
    return NextResponse.json(
      { error: "This time is no longer available. Please choose another slot." },
      { status: 409 }
    );
  }

  const { data: userProfile } = await adminClient
    .from("profiles")
    .select("name, first_name")
    .eq("id", user.id)
    .maybeSingle();

  const userName =
    (userProfile as { name?: string; first_name?: string } | null)?.first_name ||
    (userProfile as { name?: string } | null)?.name ||
    "Client";

  let generatedMeetingLink = "";
  let outlookEventId: string | null = null;

  const coachEmail = availabilityResult.coachEmail;
  if (coachEmail) {
    try {
      const teamsMeeting = await createCoachTeamsMeeting({
        coachEmail,
        appointmentDate,
        appointmentTime,
        coachName,
        userName,
        userEmail: user.email ?? null,
      });
      if (teamsMeeting) {
        generatedMeetingLink = teamsMeeting.meetingLink;
        outlookEventId = teamsMeeting.eventId;
      }
    } catch (error) {
      console.error("Failed to create Teams meeting:", error);
    }
  }

  const { data, error: insertError } = await adminClient
    .from("counselor_appointments")
    .insert({
      counselor_id: counselorId,
      user_id: user.id,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      meeting_link: generatedMeetingLink,
      outlook_event_id: outlookEventId,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This slot was just booked. Please choose another time." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  if (isEmailConfigured()) {
    const userEmail = user.email;
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
        userEmail: user.email ?? null,
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
    } else {
      console.warn(
        "[financial-session] Coach notification skipped: link a portal login email to the financial coach in Admin → Coaches."
      );
    }
  } else {
    console.warn(
      "[financial-session] Email not configured; client and coach confirmation emails were not sent."
    );
  }

  return NextResponse.json(
    {
      appointment: {
        id: (data as { id: string }).id,
        counselorId,
        userId: user.id,
        appointmentDate,
        appointmentTime,
        meetingLink: generatedMeetingLink,
        status: "scheduled",
      },
    },
    { status: 201 }
  );
}
