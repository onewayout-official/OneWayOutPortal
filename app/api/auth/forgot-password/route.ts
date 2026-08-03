import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePasswordResetLink } from "@/lib/authRecovery";
import { sendEmail, isEmailConfigured, getAuthMailSender } from "@/lib/email";
import { passwordResetEmail } from "@/lib/emailTemplates";
import { getAppUrl } from "@/lib/siteUrl";

interface ForgotPasswordBody {
  email?: string;
}

/**
 * Sends a branded One Way Out password-reset email via Graph/SMTP.
 * Always returns a generic success when the address format is valid so we do not leak whether an account exists.
 */
export async function POST(request: NextRequest) {
  let body: ForgotPasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server auth is not configured." }, { status: 503 });
  }

  // Prefer branded mail. Fall back to Supabase Auth mail only when app email is not configured.
  if (!isEmailConfigured()) {
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: getAppUrl("/reset-password"),
    });
    if (error) {
      console.error("Supabase password reset fallback failed:", error.message);
    }
    return NextResponse.json({ success: true });
  }

  const linkResult = await generatePasswordResetLink(admin, email);

  // Unknown / invalid accounts: still report success (no user enumeration).
  if ("error" in linkResult) {
    console.warn("Password reset link not generated (may be unknown email):", linkResult.error);
    return NextResponse.json({ success: true });
  }

  const template = passwordResetEmail({ email, resetUrl: linkResult.resetUrl });
  const sendResult = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    fromMailbox: getAuthMailSender(),
  });

  if (!sendResult.success) {
    console.error("Branded password reset email failed:", sendResult.error);
    return NextResponse.json(
      { error: sendResult.error ?? "Failed to send password reset email." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
