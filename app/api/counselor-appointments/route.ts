import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isSmtpConfigured } from "@/lib/email";
import { appointmentConfirmationEmail } from "@/lib/emailTemplates";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { appointmentFromRow, type CounselorAppointmentRow } from "@/lib/counselors";

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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function isPastSlot(date: string, time: string) {
  return new Date(`${date}T${time}:00`).getTime() < Date.now();
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

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsignedToken).sign(privateKey);
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? "Failed to authenticate with Google Calendar.");
  }

  return json.access_token;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hourText, minuteText] = time.split(":");
  const totalMinutes = Number(hourText) * 60 + Number(minuteText) + minutesToAdd;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

async function createGoogleMeetLink({
  appointmentDate,
  appointmentTime,
  coachName,
  coachEmail,
  userEmail,
}: {
  appointmentDate: string;
  appointmentTime: string;
  coachName: string;
  coachEmail?: string | null;
  userEmail?: string | null;
}) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const timeZone = process.env.GOOGLE_MEET_TIME_ZONE ?? "Africa/Johannesburg";

  if (!calendarId) {
    return "";
  }

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return "";
  }

  const attendees = [userEmail, coachEmail]
    .filter((email): email is string => Boolean(email?.trim()))
    .map((email) => ({ email }));

  const startDateTime = `${appointmentDate}T${appointmentTime}:00`;
  const endDateTime = `${appointmentDate}T${addMinutesToTime(appointmentTime, 20)}:00`;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `OneWayOut coaching session with ${coachName}`,
        description: "20-minute life coach/counsellor session booked from the OneWayOut portal.",
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );

  const json = (await response.json()) as {
    hangoutLink?: string;
    conferenceData?: { entryPoints?: Array<{ uri?: string }> };
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Failed to create Google Meet link.");
  }

  return (
    json.hangoutLink ??
    json.conferenceData?.entryPoints?.find((entryPoint) => entryPoint.uri)?.uri ??
    ""
  );
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
      .select("id, counselor_id, user_id, appointment_date, appointment_time, meeting_link, status, created_at")
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
    .select(
      "*, counselors(id, name, title, specialty, image, location)"
    )
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
    meetingLink?: string;
  };

  const counselorId = (body.counselorId ?? "").trim();
  const appointmentDate = (body.appointmentDate ?? "").trim();
  const appointmentTime = (body.appointmentTime ?? "").trim();
  const meetingLink = (body.meetingLink ?? "").trim();

  if (!counselorId || !appointmentDate || !appointmentTime) {
    return NextResponse.json(
      { error: "Counselor, date, and time are required." },
      { status: 400 }
    );
  }

  if (!isValidDate(appointmentDate) || !TIME_PATTERN.test(appointmentTime)) {
    return NextResponse.json({ error: "Choose a valid appointment date and time." }, { status: 400 });
  }

  if (isPastSlot(appointmentDate, appointmentTime)) {
    return NextResponse.json({ error: "Choose a future appointment slot." }, { status: 400 });
  }

  const { data: counselor, error: counselorError } = await auth.adminClient!
    .from("counselors")
    .select("id, name, availability, linked_user_id")
    .eq("id", counselorId)
    .eq("is_active", true)
    .maybeSingle();

  if (counselorError) {
    return NextResponse.json({ error: counselorError.message }, { status: 500 });
  }

  if (!counselor) {
    return NextResponse.json({ error: "Counselor not found or inactive." }, { status: 404 });
  }

  const appointmentWeekday = WEEKDAY_LABELS[new Date(`${appointmentDate}T00:00:00`).getDay()];
  const availability = ((counselor as { availability?: string[] }).availability ?? []).map((slot) =>
    slot.trim()
  );
  if (!availability.includes(`${appointmentWeekday} ${appointmentTime}`)) {
    return NextResponse.json(
      { error: "This time is not available for the selected coach." },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await auth.adminClient!
    .from("counselor_appointments")
    .select("id")
    .eq("counselor_id", counselorId)
    .eq("appointment_date", appointmentDate)
    .eq("appointment_time", appointmentTime)
    .eq("status", "scheduled")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ error: "This slot was just booked. Please choose another time." }, { status: 409 });
  }

  let generatedMeetingLink = meetingLink;
  if (!generatedMeetingLink) {
    try {
      const linkedUserId = (counselor as { linked_user_id?: string | null }).linked_user_id;
      let coachEmail: string | null = null;

      if (linkedUserId) {
        const { data: coachProfile } = await auth.adminClient!
          .from("profiles")
          .select("email")
          .eq("id", linkedUserId)
          .maybeSingle();
        coachEmail = (coachProfile as { email?: string | null } | null)?.email ?? null;
      }

      generatedMeetingLink = await createGoogleMeetLink({
        appointmentDate,
        appointmentTime,
        coachName: (counselor as { name?: string }).name ?? "your coach",
        coachEmail,
        userEmail: auth.user!.email ?? null,
      });
    } catch (error) {
      console.error("Failed to create Google Meet link:", error);
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

  const userEmail = auth.user!.email;
  if (userEmail && isSmtpConfigured()) {
    const { data: userProfile } = await auth.adminClient!
      .from("profiles")
      .select("name, first_name")
      .eq("id", auth.user!.id)
      .maybeSingle();

    const userName =
      (userProfile as { name?: string; first_name?: string } | null)?.first_name ||
      (userProfile as { name?: string } | null)?.name ||
      "there";

    const template = appointmentConfirmationEmail({
      userName,
      coachName: (counselor as { name?: string }).name ?? "your coach",
      appointmentDate,
      appointmentTime,
      meetingLink: generatedMeetingLink,
    });

    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  return NextResponse.json(
    { appointment: appointmentFromRow(data as CounselorAppointmentRow) },
    { status: 201 }
  );
}
