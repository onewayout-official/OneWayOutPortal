import { NextResponse } from "next/server";
import { counselorFromRow, type CounselorRow } from "@/lib/counselors";
import { requireAuthenticatedSupabaseClient } from "@/lib/authenticatedSupabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedSupabaseClient(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data, error } = await auth.client
    .from("counselors")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Counselor not found." }, { status: 404 });
  }

  return NextResponse.json({ counselor: counselorFromRow(data as CounselorRow) });
}
