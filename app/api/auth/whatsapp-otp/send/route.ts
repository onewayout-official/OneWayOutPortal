import { NextRequest, NextResponse } from "next/server";
import { formatE164, isValidPhone, PHONE_VALIDATION_HINT } from "@/lib/phone";
import { createAndStoreOTP } from "@/lib/otp";
import { sendWhatsAppOTP, isTwilioConfigured } from "@/lib/twilio";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthUserFromRequest } from "@/lib/requestAuth";
import { findSignupConflict, findUserByPhone, SIGNUP_PHONE_TAKEN_ERROR } from "@/lib/authIdentity";
interface SendBody {
  phone?: string;
  metadata?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    name?: string;
  };
  mode?: "login" | "signup" | "link";
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
      { error: PHONE_VALIDATION_HINT },
      { status: 400 }
    );
  }

  const mode = body.mode ?? "login";
  const admin = getSupabaseAdmin();

  if (mode === "signup" || mode === "link") {
    if (!admin) {
      return NextResponse.json({ error: "Server auth is not configured." }, { status: 503 });
    }

    if (mode === "link") {
      const user = await getAuthUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "You must be signed in to add a phone number." }, { status: 401 });
      }

      const phoneOwner = await findUserByPhone(admin, e164);
      if (phoneOwner && phoneOwner.id !== user.id) {
        return NextResponse.json({ error: SIGNUP_PHONE_TAKEN_ERROR }, { status: 409 });
      }
    } else {
      const existingUser = await findUserByPhone(admin, e164);
      const conflict = await findSignupConflict(
        {
          email: body.metadata?.email,
          excludeUserId: existingUser?.id,
        },
        admin
      );
      if (conflict) {
        return NextResponse.json({ error: conflict.error }, { status: 409 });
      }
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
