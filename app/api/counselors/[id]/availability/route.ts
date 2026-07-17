import { NextResponse } from "next/server";
import {
  createAdminClient,
  loadCoachAvailability,
  validateAvailabilityRange,
} from "@/lib/coachBooking";
import { requireAuthenticatedSupabaseClient } from "@/lib/authenticatedSupabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedSupabaseClient(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();

  if (!validateAvailabilityRange(from, to)) {
    return NextResponse.json(
      { error: "Provide valid from and to dates (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  const adminClient = await createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  try {
    const result = await loadCoachAvailability({
      adminClient,
      counselorId: id,
      from,
      to,
    });

    if (!result) {
      return NextResponse.json({ error: "Counselor not found." }, { status: 404 });
    }

    return NextResponse.json({
      slots: result.slots,
      coachEmail: result.coachEmail,
      graphSynced: result.graphSynced,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load availability.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
