import { getAppUrl } from "@/lib/siteUrl";

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>One Way Out</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1a1a;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    ${content}
    <p style="margin-top: 32px; font-size: 12px; color: #666;">One Way Out Portal</p>
  </div>
</body>
</html>`;
}

export function coachWelcomeEmail(params: {
  name: string;
  email: string;
}): { subject: string; html: string; text: string } {
  const resetUrl = getAppUrl("/reset-password");
  const subject = "Welcome to One Way Out — set up your coach account";
  const text = `Hi ${params.name},

Your coach account on One Way Out has been created.

Sign in with this email (${params.email}) and set your password here:
${resetUrl}

If you did not expect this email, you can ignore it.`;

  const html = layout(`
    <h2 style="margin-top: 0;">Welcome, ${params.name}</h2>
    <p>Your coach account on <strong>One Way Out</strong> has been created.</p>
    <p>Sign in with <strong>${params.email}</strong> and set your password:</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Set your password</a></p>
    <p style="font-size: 14px; color: #555;">Or copy this link: ${resetUrl}</p>
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
    ? `<p><a href="${params.meetingLink}">Join meeting</a></p>`
    : "";

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
