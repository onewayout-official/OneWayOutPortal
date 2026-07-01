import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appointmentFromRow, type CounselorAppointmentRow } from "@/lib/counselors";

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

  return NextResponse.json({
    appointment: appointmentFromRow(data as CounselorAppointmentRow),
  });
}
