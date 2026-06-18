import { NextResponse } from "next/server";
import { counselorFromRow, type CounselorRow } from "@/lib/counselors";
import { requireAuthenticatedSupabaseClient } from "@/lib/authenticatedSupabase";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedSupabaseClient(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.client
    .from("counselors")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counselors = (data as CounselorRow[]).map(counselorFromRow);
  return NextResponse.json({ counselors });
}
