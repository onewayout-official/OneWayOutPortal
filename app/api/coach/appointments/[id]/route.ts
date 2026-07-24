import { NextRequest, NextResponse } from "next/server";
import { appointmentFromRow, type CounselorAppointmentRow } from "@/lib/counselors";
import { getCoachContext } from "@/lib/coachApi";

const MAX_COACH_NOTES_LENGTH = 8000;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getCoachContext(request);
  if (context instanceof NextResponse) return context;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { coachNotes?: unknown };

  if (typeof body.coachNotes !== "string") {
    return NextResponse.json({ error: "coachNotes must be a string." }, { status: 400 });
  }

  const coachNotes = body.coachNotes.trim();
  if (coachNotes.length > MAX_COACH_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `Notes must be at most ${MAX_COACH_NOTES_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const { data, error } = await context.adminClient
    .from("counselor_appointments")
    .update({ coach_notes: coachNotes })
    .eq("id", id)
    .eq("counselor_id", context.counselorId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const row = data as CounselorAppointmentRow;
  const { data: profile } = await context.adminClient
    .from("profiles")
    .select("name, email, phone")
    .eq("id", row.user_id)
    .maybeSingle();

  return NextResponse.json({
    appointment: appointmentFromRow(row, profile ?? undefined),
  });
}
