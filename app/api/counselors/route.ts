import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { counselorFromRow, type CounselorRow } from "@/lib/counselors";

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

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if ("error" in auth && auth.error) return auth.error;

  const { data, error } = await auth.client!
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
