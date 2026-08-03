/**
 * One-off: send a branded coach welcome email for design testing.
 * Usage: npx --yes tsx --tsconfig tsconfig.json scripts/send-test-coach-welcome.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const to = process.argv[2] || "feroze104@gmail.com";
  const name = process.argv[3] || "Feroze";

  const { getSupabaseAdmin } = await import("../lib/supabaseAdmin");
  const { generatePasswordResetLink } = await import("../lib/authRecovery");
  const { coachWelcomeEmail } = await import("../lib/emailTemplates");
  const { sendEmail, isEmailConfigured, getAuthMailSender, getMailFromDisplayName } =
    await import("../lib/email");

  if (!isEmailConfigured()) {
    throw new Error("Email is not configured.");
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase admin is not configured.");
  }

  const linkResult = await generatePasswordResetLink(admin, to);
  const resetUrl =
    "error" in linkResult
      ? "https://portal.onewayout.co.za/reset-password"
      : linkResult.resetUrl;

  if ("error" in linkResult) {
    console.warn(
      "Could not generate recovery link (email may not exist in Auth). Using fallback URL for design preview:",
      linkResult.error
    );
  }

  const template = coachWelcomeEmail({ name, email: to, resetUrl });
  const result = await sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    fromMailbox: getAuthMailSender(),
    fromDisplayName: getMailFromDisplayName(),
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to send coach welcome email.");
  }

  console.log(JSON.stringify({ success: true, sent: true, to }));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
