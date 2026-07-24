import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface CoachContext {
  adminClient: SupabaseClient;
  userId: string;
  counselorId: string;
}

export async function getCoachContext(
  request: NextRequest
): Promise<CoachContext | NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Coach API not configured. Missing Supabase environment variables." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const publicClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await publicClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { role?: string } | null)?.role !== "counselor") {
    return NextResponse.json({ error: "Coach access only." }, { status: 403 });
  }

  const { data: counselor } = await adminClient
    .from("counselors")
    .select("id")
    .eq("linked_user_id", user.id)
    .maybeSingle();

  if (!counselor) {
    return NextResponse.json(
      { error: "Your coach account is not linked to a counselor profile yet." },
      { status: 403 }
    );
  }

  return {
    adminClient,
    userId: user.id,
    counselorId: (counselor as { id: string }).id,
  };
}
