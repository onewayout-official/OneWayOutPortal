import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  loadCoachAvailability,
} from "@/lib/coachBooking";
import { requireAuthenticatedSupabaseClient } from "@/lib/authenticatedSupabase";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedSupabaseClient(request);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    return NextResponse.json(
      { error: "Provide valid from and to dates (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  const adminClient = await createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 500 }
    );
  }

  const { data: coach, error: coachError } = await adminClient
    .from("counselors")
    .select("id, availability")
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
          'Financial coach is not configured. In Admin → Coaches, edit the coach (e.g. Paul) and enable "Financial coach", then set availability.',
      },
      { status: 404 }
    );
  }

  const counselorId = (coach as { id: string }).id;

  try {
    const result = await loadCoachAvailability({
      adminClient,
      counselorId,
      from,
      to,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Financial coach is not configured." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      slots: result.slots,
      availability: (coach as { availability?: string[] }).availability ?? [],
      graphSynced: result.graphSynced,
      graphSyncStatus: result.graphSyncStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load availability.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
