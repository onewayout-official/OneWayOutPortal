import { createHash, randomInt } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const OTP_LENGTH = 6;
const SEND_COOLDOWN_MS = 60_000;
const MAX_SENDS_PER_HOUR = 5;

function getExpiryMinutes(): number {
  const parsed = Number(process.env.OTP_EXPIRY_MINUTES ?? "5");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

function getMaxAttempts(): number {
  const parsed = Number(process.env.OTP_MAX_ATTEMPTS ?? "3");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  const max = 10 ** OTP_LENGTH;
  const num = randomInt(0, max);
  return num.toString().padStart(OTP_LENGTH, "0");
}

export async function createAndStoreOTP(phone: string): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { success: false, error: "Server auth is not configured." };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: recentCount, error: countError } = await admin
    .from("phone_otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", oneHourAgo);

  if (countError) {
    return { success: false, error: "Unable to process OTP request." };
  }

  if ((recentCount ?? 0) >= MAX_SENDS_PER_HOUR) {
    return {
      success: false,
      error: "Too many OTP requests. Please wait an hour and try again.",
    };
  }

  const { data: latest } = await admin
    .from("phone_otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.created_at) {
    const elapsed = Date.now() - new Date(latest.created_at).getTime();
    if (elapsed < SEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSec} seconds before requesting another code.`,
      };
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + getExpiryMinutes() * 60 * 1000).toISOString();

  const { error: insertError } = await admin.from("phone_otp_codes").insert({
    phone,
    code_hash: hashCode(code),
    expires_at: expiresAt,
    attempts: 0,
  });

  if (insertError) {
    return { success: false, error: "Unable to store OTP. Please try again." };
  }

  return { success: true, code };
}

export async function verifyStoredOTP(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { success: false, error: "Server auth is not configured." };
  }

  const now = new Date().toISOString();

  const { data: row, error } = await admin
    .from("phone_otp_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("phone", phone)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: "Invalid or expired OTP code. Please request a new one." };
  }

  const maxAttempts = getMaxAttempts();
  if (row.attempts >= maxAttempts) {
    return {
      success: false,
      error: "Too many failed attempts. Please request a new code.",
    };
  }

  const isValid = hashCode(code) === row.code_hash;

  if (!isValid) {
    await admin
      .from("phone_otp_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { success: false, error: "Invalid OTP code. Please try again." };
  }

  await admin.from("phone_otp_codes").delete().eq("id", row.id);

  return { success: true };
}

export async function invalidateOTPsForPhone(phone: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("phone_otp_codes").delete().eq("phone", phone);
}
