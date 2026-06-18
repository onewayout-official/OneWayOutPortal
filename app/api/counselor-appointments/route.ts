import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appointmentFromRow, type CounselorAppointmentRow } from "@/lib/counselors";

async function getAuthenticatedUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { error: NextResponse.json({ error: "Supabase not configured." }, { status: 500 }) };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { error: NextResponse.json({ error: "Missing auth token." }, { status: 401 }) };
  }

  const client = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return { client, user };
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

  const { data: counselor, error: counselorError } = await auth.client!
    .from("counselors")
    .select("id")
    .eq("id", counselorId)
    .eq("is_active", true)
    .maybeSingle();

  if (counselorError) {
    return NextResponse.json({ error: counselorError.message }, { status: 500 });
  }

  if (!counselor) {
    return NextResponse.json({ error: "Counselor not found or inactive." }, { status: 404 });
  }

  const { data, error } = await auth.client!
    .from("counselor_appointments")
    .insert({
      counselor_id: counselorId,
      user_id: auth.user!.id,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      meeting_link: meetingLink,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { appointment: appointmentFromRow(data as CounselorAppointmentRow) },
    { status: 201 }
  );
}
