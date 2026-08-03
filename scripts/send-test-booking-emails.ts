/**
 * One-off: send branded session booking emails for design testing.
 * Usage: npx --yes tsx scripts/send-test-booking-emails.ts [email] [name]
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

  const {
    appointmentConfirmationEmail,
    coachBookingNotificationEmail,
  } = await import("../lib/emailTemplates");
  const { sendEmail, isEmailConfigured, getAuthMailSender, getMailFromDisplayName } =
    await import("../lib/email");

  if (!isEmailConfigured()) {
    throw new Error("Email is not configured.");
  }

  const sample = {
    appointmentDate: "Thursday, 6 August 2026",
    appointmentTime: "10:00",
    meetingLink: "https://teams.microsoft.com/l/meetup-join/sample",
  };

  const userTemplate = appointmentConfirmationEmail({
    userName: name,
    coachName: "Alex Coach",
    ...sample,
  });

  const coachTemplate = coachBookingNotificationEmail({
    coachName: name,
    userName: "Jordan Client",
    userEmail: "jordan.client@example.com",
    ...sample,
  });

  const common = {
    to,
    fromMailbox: getAuthMailSender(),
    fromDisplayName: getMailFromDisplayName(),
  };

  const userSend = await sendEmail({
    ...common,
    subject: `[Preview] ${userTemplate.subject}`,
    html: userTemplate.html,
    text: userTemplate.text,
  });

  const coachSend = await sendEmail({
    ...common,
    subject: `[Preview] ${coachTemplate.subject}`,
    html: coachTemplate.html,
    text: coachTemplate.text,
  });

  console.log(
    JSON.stringify({
      success: userSend.success && coachSend.success,
      userConfirmation: userSend.success,
      coachNotification: coachSend.success,
      to,
      userError: userSend.error,
      coachError: coachSend.error,
    })
  );

  if (!userSend.success || !coachSend.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
