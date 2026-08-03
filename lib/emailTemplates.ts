import { getAppUrl } from "@/lib/siteUrl";

function getEmailLogoUrl(): string {
  return (
    process.env.EMAIL_LOGO_URL?.trim() ||
    getAppUrl("/onewayout-logo.png")
  );
}

function layout(content: string, footerHtml?: string): string {
  const footer =
    footerHtml ??
    `<p style="margin-top:28px;font-size:12px;color:#666;">One Way Out Portal · This is an automated message.</p>`;
  const logoUrl = getEmailLogoUrl();

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>One Way Out</title></head>
<body style="margin:0;padding:0;background:#f4f7f7;font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#2f6064;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <img src="${logoUrl}" alt="OneWayOut" width="96" height="96" style="display:block;margin:0 auto;width:96px;height:96px;border-radius:16px;object-fit:cover;border:0;" />
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      ${content}
      ${footer}
    </div>
  </div>
</body>
</html>`;
}

function welcomeEmailFooter(unsubscribeUrl: string): { html: string; text: string } {
  const html = `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:11px;line-height:1.6;color:#666;">
      <p style="margin:0 0 8px;">OneWayOut (Pty) Ltd · W17, 17 Dock Road, V&amp;A Waterfront, Cape Town, South Africa</p>
      <p style="margin:0 0 8px;">
        <a href="https://onewayout.co.za" style="color:#2f6064;text-decoration:none;">onewayout.co.za</a>
        · WA: <a href="https://wa.me/27781765677" style="color:#2f6064;text-decoration:none;">+27 78 176 5677</a>
      </p>
      <p style="margin:0 0 8px;">
        Socials:
        <a href="https://www.linkedin.com/company/onewayout" style="color:#2f6064;text-decoration:none;">LinkedIn OneWayOut (Pty) Ltd</a>
        · <a href="https://www.facebook.com/onewayout.official" style="color:#2f6064;text-decoration:none;">Facebook @onewayout.official</a>
        · <a href="https://www.instagram.com/one1wayout_official" style="color:#2f6064;text-decoration:none;">Instagram @one1wayout_official</a>
        · <a href="https://www.tiktok.com/@1onewayout" style="color:#2f6064;text-decoration:none;">TikTok @1onewayout</a>
      </p>
      <p style="margin:0 0 8px;">Authorised juristic representative under FinMeUp, FSP No. 51310</p>
      <p style="margin:0;">
        <a href="${unsubscribeUrl}" style="color:#2f6064;text-decoration:underline;">Unsubscribe</a>
        · You're receiving this because you signed up at onewayout.co.za
      </p>
    </div>`;

  const text = `
OneWayOut (Pty) Ltd · W17, 17 Dock Road, V&A Waterfront, Cape Town, South Africa
onewayout.co.za · WA: +27 78 176 5677
Socials: LinkedIn OneWayOut (Pty) Ltd · Facebook @onewayout.official · Instagram @one1wayout_official · TikTok @1onewayout
Authorised juristic representative under FinMeUp, FSP No. 51310
Unsubscribe (${unsubscribeUrl}) · You're receiving this because you signed up at onewayout.co.za`;

  return { html, text };
}

export function passwordResetEmail(params: {
  email: string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "Reset your One Way Out password";
  const text = `Reset your One Way Out password

We received a request to reset the password for ${params.email}.

Open this link to choose a new password:
${params.resetUrl}

This link expires for security. If you did not request a password reset, you can ignore this email.`;

  const html = layout(`
    <h2 style="margin-top:0;color:#1a1a1a;">Reset your password</h2>
    <p>We received a request to reset the password for <strong>${params.email}</strong>.</p>
    <p>Click the button below to choose a new password:</p>
    <p><a href="${params.resetUrl}" style="display:inline-block;padding:12px 20px;background:#2f6064;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset password</a></p>
    <p style="font-size:14px;color:#555;">Or copy this link:<br>${params.resetUrl}</p>
    <p style="font-size:13px;color:#777;">This link expires for security. If you did not request this, you can ignore this email.</p>
  `);

  return { subject, html, text };
}

export function userWelcomeEmail(params: {
  name: string;
  email: string;
  actionUrl: string;
  /** When true, CTA confirms the email; otherwise it opens the portal. */
  needsConfirmation?: boolean;
  unsubscribeUrl?: string;
}): { subject: string; html: string; text: string } {
  const firstName = params.name.trim().split(/\s+/)[0] || "there";
  const subject = `Your first mission is waiting, ${firstName}`;
  const ctaLabel = params.needsConfirmation ? "Confirm your email" : "Start my first mission";
  const unsubscribeUrl =
    params.unsubscribeUrl?.trim() ||
    getAppUrl(`/unsubscribe?email=${encodeURIComponent(params.email.trim().toLowerCase())}`);
  const footer = welcomeEmailFooter(unsubscribeUrl);

  const text = `Hi ${firstName},

You've just taken the hardest step — deciding that things are going to change. Welcome. You're in the right place.

OneWayOut turns the road out of financial stress into a game you can actually win: small missions, real rewards, and a human coach in your corner when you need one.

Your first mission is ready. It takes about 10 minutes and you could unlock up to 5,000 reward points: complete your financial information and goals so we can map your way out.

${ctaLabel}:
${params.actionUrl}

If you did not create this account, you can ignore this email.
${footer.text}`;

  const html = layout(
    `
    <h2 style="margin-top:0;color:#1a1a1a;">Hi ${firstName},</h2>
    <p>You've just taken the hardest step — deciding that things are going to change. Welcome. You're in the right place.</p>
    <p>OneWayOut turns the road out of financial stress into a game you can actually win: small missions, real rewards, and a human coach in your corner when you need one.</p>
    <p>Your first mission is ready. It takes about 10 minutes and you could unlock up to 5,000 reward points: complete your financial information and goals so we can map your way out.</p>
    <p><a href="${params.actionUrl}" style="display:inline-block;padding:12px 20px;background:#ffffff;color:#2f6064;border:2px solid #2f6064;text-decoration:none;border-radius:6px;font-weight:700;">${ctaLabel}</a></p>
    <p style="font-size:14px;color:#555;">Or copy this link:<br>${params.actionUrl}</p>
    <p style="font-size:13px;color:#777;">If you did not create this account, you can ignore this email.</p>
  `,
    footer.html
  );

  return { subject, html, text };
}

export function coachWelcomeEmail(params: {
  name: string;
  email: string;
  /** One-time Supabase recovery link. Must include the auth token — a bare /reset-password URL will not work. */
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const resetUrl = params.resetUrl;
  const subject = "Welcome to One Way Out — set up your coach account";
  const text = `Hi ${params.name},

Your coach account on One Way Out has been created.

Sign in with this email (${params.email}) and set your password here:
${resetUrl}

This link expires for security. If it has expired, use Forgot password on the sign-in page.

If you did not expect this email, you can ignore it.`;

  const html = layout(`
    <h2 style="margin-top:0;color:#1a1a1a;">Welcome, ${params.name}</h2>
    <p>Your coach account on <strong>One Way Out</strong> has been created.</p>
    <p>Sign in with <strong>${params.email}</strong> and set your password:</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2f6064;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Set your password</a></p>
    <p style="font-size:14px;color:#555;">Or copy this link:<br>${resetUrl}</p>
    <p style="font-size:13px;color:#777;">This link expires for security. If it has expired, use <em>Forgot password</em> on the sign-in page.</p>
  `);

  return { subject, html, text };
}

export function appointmentConfirmationEmail(params: {
  userName: string;
  coachName: string;
  appointmentDate: string;
  appointmentTime: string;
  meetingLink?: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `Appointment confirmed with ${params.coachName}`;
  const meetingLine = params.meetingLink
    ? `\nJoin: ${params.meetingLink}`
    : "";
  const text = `Hi ${params.userName},

Your counseling appointment is confirmed.

Coach: ${params.coachName}
Date: ${params.appointmentDate}
Time: ${params.appointmentTime}${meetingLine}

See you then!`;

  const meetingHtml = params.meetingLink
    ? `<p><a href="${params.meetingLink}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Join Teams meeting</a></p>`
    : `<p style="font-size:14px;color:#555;">Your Teams link will be available in the portal before the session.</p>`;

  const html = layout(`
    <h2 style="margin-top: 0;">Appointment confirmed</h2>
    <p>Hi ${params.userName},</p>
    <p>Your session with <strong>${params.coachName}</strong> is booked.</p>
    <ul>
      <li><strong>Date:</strong> ${params.appointmentDate}</li>
      <li><strong>Time:</strong> ${params.appointmentTime}</li>
    </ul>
    ${meetingHtml}
  `);

  return { subject, html, text };
}

export function coachBookingNotificationEmail(params: {
  coachName: string;
  userName: string;
  userEmail?: string | null;
  appointmentDate: string;
  appointmentTime: string;
  meetingLink?: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `New session booked — ${params.userName}`;
  const clientLine = params.userEmail
    ? `${params.userName} (${params.userEmail})`
    : params.userName;
  const meetingLine = params.meetingLink ? `\nJoin: ${params.meetingLink}` : "";
  const text = `Hi ${params.coachName},

A new coaching session has been booked.

Client: ${clientLine}
Date: ${params.appointmentDate}
Time: ${params.appointmentTime}${meetingLine}

The session has been added to your Outlook calendar.`;

  const meetingHtml = params.meetingLink
    ? `<p><a href="${params.meetingLink}">Join Teams meeting</a></p>`
    : "";

  const html = layout(`
    <h2 style="margin-top: 0;">New session booked</h2>
    <p>Hi ${params.coachName},</p>
    <p><strong>${clientLine}</strong> booked a session with you.</p>
    <ul>
      <li><strong>Date:</strong> ${params.appointmentDate}</li>
      <li><strong>Time:</strong> ${params.appointmentTime}</li>
    </ul>
    ${meetingHtml}
    <p style="font-size:14px;color:#555;">This session is on your Outlook calendar.</p>
  `);

  return { subject, html, text };
}

export function appointmentCancellationEmail(params: {
  recipientName: string;
  coachName: string;
  userName: string;
  appointmentDate: string;
  appointmentTime: string;
  cancelledBy: "user" | "coach";
}): { subject: string; html: string; text: string } {
  const subject = `Session cancelled — ${params.appointmentDate} ${params.appointmentTime}`;
  const cancelledByLine =
    params.cancelledBy === "user"
      ? `${params.userName} cancelled their session.`
      : "This session was cancelled.";
  const text = `Hi ${params.recipientName},

${cancelledByLine}

Coach: ${params.coachName}
Client: ${params.userName}
Date: ${params.appointmentDate}
Time: ${params.appointmentTime}`;

  const html = layout(`
    <h2 style="margin-top: 0;">Session cancelled</h2>
    <p>Hi ${params.recipientName},</p>
    <p>${cancelledByLine}</p>
    <ul>
      <li><strong>Coach:</strong> ${params.coachName}</li>
      <li><strong>Client:</strong> ${params.userName}</li>
      <li><strong>Date:</strong> ${params.appointmentDate}</li>
      <li><strong>Time:</strong> ${params.appointmentTime}</li>
    </ul>
  `);

  return { subject, html, text };
}
