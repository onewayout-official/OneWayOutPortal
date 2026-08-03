import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBrandedUserWelcome } from "@/lib/userWelcome";

interface WelcomeBody {
  email?: string;
  name?: string;
  needsConfirmation?: boolean;
}

/**
 * Sends a branded signup/welcome email via Graph.
 * Intended to be called right after a successful registration.
 */
export async function POST(request: NextRequest) {
  let body: WelcomeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(body.name ?? "").trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server auth is not configured." }, { status: 503 });
  }

  const result = await sendBrandedUserWelcome({
    adminClient: admin,
    email,
    name,
    needsConfirmation: Boolean(body.needsConfirmation),
  });

  // Don't fail the signup UX if mail delivery has a transient issue.
  if (!result.success) {
    console.warn("Welcome email not sent:", result.error);
  }

  return NextResponse.json({ success: true, sent: result.success });
}
