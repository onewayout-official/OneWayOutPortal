import { NextRequest, NextResponse } from "next/server";
import { formatE164, isValidPhone } from "@/lib/phone";
import { createAndStoreOTP } from "@/lib/otp";
import { sendWhatsAppOTP, isTwilioConfigured } from "@/lib/twilio";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface SendBody {
  phone?: string;
  metadata?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  mode?: "login" | "signup";
}

export async function POST(request: NextRequest) {
  if (!isTwilioConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp OTP is not configured on the server." },
      { status: 503 }
    );
  }

  let body: SendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const e164 = formatE164(body.phone);
  if (!e164 || !isValidPhone(e164)) {
    return NextResponse.json(
      { error: "Please enter a valid mobile number (e.g. +27 79 123 4567)." },
      { status: 400 }
    );
  }

  const mode = body.mode ?? "login";

  if (mode === "signup") {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server auth is not configured." }, { status: 503 });
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", e164)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "This number is already registered. Please sign in instead." },
        { status: 409 }
      );
    }
  }

  const otpResult = await createAndStoreOTP(e164);
  if (!otpResult.success || !otpResult.code) {
    return NextResponse.json(
      { error: otpResult.error ?? "Failed to generate OTP." },
      { status: 429 }
    );
  }

  const sendResult = await sendWhatsAppOTP(e164, otpResult.code);
  if (!sendResult.success) {
    return NextResponse.json(
      { error: sendResult.error ?? "Failed to send WhatsApp message." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, phone: e164 });
}
