import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthResult =
  | { client: SupabaseClient; token: string }
  | { error: NextResponse };

export function getAuthenticatedSupabaseClient(request: Request): AuthResult {
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

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return { client, token };
}

export async function requireAuthenticatedSupabaseClient(
  request: Request
): Promise<AuthResult> {
  const auth = getAuthenticatedSupabaseClient(request);
  if ("error" in auth) return auth;

  const {
    data: { user },
    error,
  } = await auth.client.auth.getUser(auth.token);

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return auth;
}
