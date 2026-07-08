import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM
  );
}

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !process.env.SMTP_FROM) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM;

  if (!mailer || !from) {
    return {
      success: false,
      error: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM.",
    };
  }

  try {
    await mailer.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]+>/g, " "),
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send email.";
    return { success: false, error: msg };
  }
}

export function getCoachSetupEmailMode(): "supabase" | "smtp" | "both" {
  const mode = (process.env.COACH_SETUP_EMAIL_MODE ?? "both").toLowerCase();
  if (mode === "supabase" || mode === "smtp") return mode;
  return "both";
}
