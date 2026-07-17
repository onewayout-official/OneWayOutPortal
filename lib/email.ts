import nodemailer from "nodemailer";
import { isMicrosoftGraphConfigured, sendGraphEmail } from "@/lib/microsoftGraph";

let transporter: nodemailer.Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM
  );
}

/** Mailbox UPN used as the Graph sendMail sender (e.g. appointments@onewayout.co.za). */
export function getGraphMailSender(): string {
  const explicit = process.env.GRAPH_MAIL_SENDER?.trim();
  if (explicit) return explicit;

  const from = process.env.SMTP_FROM ?? "";
  const bracketMatch = from.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) return bracketMatch[1].trim();

  return from.replace(/^["']|["']$/g, "").trim();
}

export function isGraphEmailConfigured(): boolean {
  return isMicrosoftGraphConfigured() && Boolean(getGraphMailSender());
}

export function getEmailTransport(): "graph" | "smtp" {
  const mode = (process.env.EMAIL_TRANSPORT ?? "auto").toLowerCase();
  if (mode === "graph") return "graph";
  if (mode === "smtp") return "smtp";
  // auto: Graph first (works with Security Defaults ON; no SMTP password needed)
  if (isGraphEmailConfigured()) return "graph";
  return "smtp";
}

/** True when either Graph or SMTP can send transactional mail. */
export function isEmailConfigured(): boolean {
  if (getEmailTransport() === "graph") return isGraphEmailConfigured();
  return isSmtpConfigured();
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
    requireTLS: !secure,
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

async function sendEmailViaSmtp(
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
    const replyTo = process.env.SMTP_REPLY_TO?.trim();
    await mailer.sendMail({
      from,
      to: options.to,
      replyTo: replyTo || undefined,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]+>/g, " "),
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send email.";
    console.error("SMTP send failed:", msg);
    return { success: false, error: msg };
  }
}

async function sendEmailViaGraph(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  const senderMailbox = getGraphMailSender();
  if (!senderMailbox) {
    return {
      success: false,
      error: "Set GRAPH_MAIL_SENDER or SMTP_FROM with the sender mailbox address.",
    };
  }

  try {
    await sendGraphEmail({
      senderMailbox,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: process.env.SMTP_REPLY_TO?.trim() || null,
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send email via Graph.";
    console.error("Graph sendMail failed:", msg);
    return { success: false, error: msg };
  }
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  if (getEmailTransport() === "graph") {
    return sendEmailViaGraph(options);
  }
  return sendEmailViaSmtp(options);
}

export function getCoachSetupEmailMode(): "supabase" | "smtp" | "both" {
  const mode = (process.env.COACH_SETUP_EMAIL_MODE ?? "both").toLowerCase();
  if (mode === "supabase" || mode === "smtp") return mode;
  return "both";
}
