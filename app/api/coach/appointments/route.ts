import { NextRequest, NextResponse } from "next/server";
import { appointmentFromRow, type CounselorAppointmentRow } from "@/lib/counselors";
import { getCoachContext } from "@/lib/coachApi";

export async function GET(request: NextRequest) {
  const context = await getCoachContext(request);
  if (context instanceof NextResponse) return context;

  const { data, error } = await context.adminClient
    .from("counselor_appointments")
    .select("*")
    .eq("counselor_id", context.counselorId)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CounselorAppointmentRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id))];

  const profilesByUserId = new Map<
    string,
    { name?: string | null; email?: string | null; phone?: string | null }
  >();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await context.adminClient
      .from("profiles")
      .select("id, name, email, phone")
      .in("id", userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    for (const profile of profiles ?? []) {
      profilesByUserId.set((profile as { id: string }).id, profile as {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
      });
    }
  }

  const appointments = rows.map((row) =>
    appointmentFromRow(row, profilesByUserId.get(row.user_id))
  );

  return NextResponse.json({ appointments, counselorId: context.counselorId });
}
