import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appointmentFromRow, type CounselorAppointmentRow } from "@/lib/counselors";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { appointmentCancellationEmail } from "@/lib/emailTemplates";
import { resolveCoachMailboxEmail } from "@/lib/coachBooking";
import { deleteCoachTeamsMeeting } from "@/lib/microsoftGraph";

async function getAppointmentContext(request: NextRequest) {
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

  const publicClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error,
  } = await publicClient.auth.getUser(token);

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { adminClient, user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAppointmentContext(request);
  if ("error" in context && context.error) return context.error;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const nextStatus = (body.status ?? "cancelled").trim();

  if (nextStatus !== "cancelled") {
    return NextResponse.json({ error: "Only cancellation is supported." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await context.adminClient!
    .from("counselor_appointments")
    .select("*, counselors(id, name, linked_user_id)")
    .eq("id", id)
    .eq("user_id", context.user!.id)
    .eq("status", "scheduled")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Appointment not found or cannot be cancelled." },
      { status: 404 }
    );
  }

  const row = existing as CounselorAppointmentRow & {
    counselors?: { name?: string | null; linked_user_id?: string | null } | Array<{
      name?: string | null;
      linked_user_id?: string | null;
    }> | null;
  };

  const counselor = Array.isArray(row.counselors) ? row.counselors[0] : row.counselors;
  const coachName = counselor?.name ?? "Coach";
  const coachEmail = await resolveCoachMailboxEmail(
    context.adminClient!,
    counselor?.linked_user_id
  );

  if (coachEmail && row.outlook_event_id) {
    try {
      await deleteCoachTeamsMeeting(coachEmail, row.outlook_event_id);
    } catch (error) {
      console.error("Failed to delete Outlook event:", error);
    }
  }

  const { data, error } = await context.adminClient!
    .from("counselor_appointments")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", context.user!.id)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Appointment not found or cannot be cancelled." },
      { status: 404 }
    );
  }

  if (isEmailConfigured()) {
    const { data: userProfile } = await context.adminClient!
      .from("profiles")
      .select("name, first_name, email")
      .eq("id", context.user!.id)
      .maybeSingle();

    const userName =
      (userProfile as { first_name?: string; name?: string } | null)?.first_name ||
      (userProfile as { name?: string } | null)?.name ||
      "Client";
    const userEmail = (userProfile as { email?: string } | null)?.email ?? context.user!.email;

    const cancelParams = {
      coachName,
      userName,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      cancelledBy: "user" as const,
    };

    if (userEmail) {
      const userTemplate = appointmentCancellationEmail({
        recipientName: userName,
        ...cancelParams,
      });
      await sendEmail({
        to: userEmail,
        subject: userTemplate.subject,
        html: userTemplate.html,
        text: userTemplate.text,
      });
    }

    if (coachEmail) {
      const coachTemplate = appointmentCancellationEmail({
        recipientName: coachName,
        ...cancelParams,
      });
      await sendEmail({
        to: coachEmail,
        subject: coachTemplate.subject,
        html: coachTemplate.html,
        text: coachTemplate.text,
      });
    }
  }

  return NextResponse.json({
    appointment: appointmentFromRow(data as CounselorAppointmentRow),
  });
}
