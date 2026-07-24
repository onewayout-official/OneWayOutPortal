import { NextRequest, NextResponse } from "next/server";
import { formatE164, isValidPhone, PHONE_VALIDATION_HINT } from "@/lib/phone";
import { findSignupConflict } from "@/lib/authIdentity";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface CheckBody {
  email?: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server auth is not configured." }, { status: 503 });
  }

  let body: CheckBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim();
  const e164 = body.phone ? formatE164(body.phone) : undefined;

  if (!email && !e164) {
    return NextResponse.json(
      { error: "Provide an email and/or phone number to validate." },
      { status: 400 }
    );
  }

  if (body.phone && !e164) {
    return NextResponse.json({ error: PHONE_VALIDATION_HINT }, { status: 400 });
  }

  if (e164 && !isValidPhone(e164)) {
    return NextResponse.json({ error: PHONE_VALIDATION_HINT }, { status: 400 });
  }

  const conflict = await findSignupConflict({ email, phone: e164 }, admin);
  if (conflict) {
    return NextResponse.json({ error: conflict.error, field: conflict.field }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
