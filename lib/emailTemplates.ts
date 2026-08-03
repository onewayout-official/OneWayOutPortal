import { getAppUrl } from "@/lib/siteUrl";

function getEmailLogoUrl(): string {
  return (
    process.env.EMAIL_LOGO_URL?.trim() ||
    getAppUrl("/onewayout-logo.png")
  );
}

function withQueryParam(url: string, key: string, value: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

function layout(
  content: string,
  options?: {
    footerHtml?: string;
    headerTitle?: string;
    headerSubtitle?: string;
  }
): string {
  const footer =
    options?.footerHtml ??
    `<p style="margin-top:28px;font-size:12px;color:#666;">One Way Out Portal · This is an automated message.</p>`;
  const logoUrl = getEmailLogoUrl();
  const headerTitle = options?.headerTitle ?? "Welcome to OneWayOut";
  const headerSubtitle =
    options?.headerSubtitle ??
    "From financial crisis to Financial Freedom — the gamified way";

  // Single-table card layout — Gmail is less likely to fold the body after the header.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>One Way Out</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f7;font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f7f7;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" style="background:#2f6064;padding:24px 24px 20px;text-align:center;">
              <img src="${logoUrl}" alt="OneWayOut" width="96" height="96" style="display:block;margin:0 auto;width:96px;height:96px;border-radius:16px;object-fit:cover;border:0;" />
              <p style="margin:16px 0 0;font-size:22px;font-weight:700;color:#fae3c8;letter-spacing:-0.02em;text-align:center;">${headerTitle}</p>
              <p style="margin:8px 0 0;font-size:13px;font-style:italic;color:#ffffff;text-align:center;line-height:1.4;">${headerSubtitle}</p>
            </td>
          </tr>
          <tr>
            <td align="left" style="background:#ffffff;padding:24px;text-align:left;">
              ${content}
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function companyFooter(params: {
  unsubscribeUrl?: string;
  reason: string;
}): { html: string; text: string } {
  const unsubscribeHtml = params.unsubscribeUrl
    ? `<a href="${params.unsubscribeUrl}" style="color:#2f6064;text-decoration:underline;">Unsubscribe</a> · `
    : "";
  const unsubscribeText = params.unsubscribeUrl
    ? `Unsubscribe (${params.unsubscribeUrl}) · `
    : "";

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
      <p style="margin:0;">${unsubscribeHtml}${params.reason}</p>
    </div>`;

  const text = `
OneWayOut (Pty) Ltd · W17, 17 Dock Road, V&A Waterfront, Cape Town, South Africa
onewayout.co.za · WA: +27 78 176 5677
Socials: LinkedIn OneWayOut (Pty) Ltd · Facebook @onewayout.official · Instagram @one1wayout_official · TikTok @1onewayout
Authorised juristic representative under FinMeUp, FSP No. 51310
${unsubscribeText}${params.reason}`;

  return { html, text };
}

function teamSignOffHtml(): string {
  return `
    <div style="margin:24px 0 8px;text-align:left;">
      <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#1a1a1a;">We're glad you're here. One way out — forward.</p>
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#306164;">The OneWayOut Team</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#1a1a1a;">Questions? Just reply to this email — a real person reads every one.</p>
    </div>`;
}

function teamSignOffText(): string {
  return `We're glad you're here. One way out — forward.
The OneWayOut Team
Questions? Just reply to this email — a real person reads every one.`;
}

function primaryButtonHtml(href: string, label: string): string {
  return `<p style="text-align:center;margin:24px 0;"><a href="${href}" style="display:inline-block;padding:12px 20px;background:#2f6064;color:#ffffff;border:2px solid #2f6064;text-decoration:none;border-radius:6px;font-weight:700;">${label}</a></p>`;
}

function creamSectionHtml(title: string, bodyHtml: string): string {
  return `
    <div style="margin:24px 0;padding:20px;background:#f5f2ec;border-radius:8px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#306164;letter-spacing:0.04em;text-transform:uppercase;">${title}</p>
      ${bodyHtml}
    </div>`;
}

function welcomeEmailFooter(unsubscribeUrl: string): { html: string; text: string } {
  return companyFooter({
    unsubscribeUrl,
    reason: "You're receiving this because you signed up at onewayout.co.za",
  });
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

  const html = layout(
    `
    <h2 style="margin-top:0;color:#1a1a1a;">Reset your password</h2>
    <p>We received a request to reset the password for <strong>${params.email}</strong>.</p>
    <p>Click the button below to choose a new password:</p>
    ${primaryButtonHtml(params.resetUrl, "Reset password")}
    <p style="font-size:13px;color:#777;">This link expires for security. If you did not request this, you can ignore this email.</p>
  `,
    {
      headerTitle: "Reset your password",
      headerSubtitle: "Secure your OneWayOut account",
      footerHtml: companyFooter({
        reason: "You're receiving this because a password reset was requested for your account.",
      }).html,
    }
  );

  return { subject, html, text };
}

export function userWelcomeEmail(params: {
  name: string;
  email: string;
  actionUrl: string;
  /** When true, CTA confirms the email; otherwise it opens the portal. */
  needsConfirmation?: boolean;
  unsubscribeUrl?: string;
  /** Unique per send — stops Gmail from folding duplicate bodies in a thread. */
  sendId?: string;
}): { subject: string; html: string; text: string } {
  const firstName = params.name.trim().split(/\s+/)[0] || "there";
  const sendId = params.sendId?.trim() || `${Date.now().toString(36)}`;
  const subject = `Your first mission is waiting, ${firstName}`;
  const ctaLabel = params.needsConfirmation ? "Confirm your email" : "Start my first mission";
  const actionUrl = withQueryParam(params.actionUrl, "owo", sendId);
  const unsubscribeUrl = withQueryParam(
    params.unsubscribeUrl?.trim() ||
      getAppUrl(`/unsubscribe?email=${encodeURIComponent(params.email.trim().toLowerCase())}`),
    "owo",
    sendId
  );
  const footer = welcomeEmailFooter(unsubscribeUrl);

  const text = `Hi ${firstName},

You've just taken the hardest step — deciding that things are going to change. Welcome. You're in the right place.

OneWayOut turns the road out of financial stress into a game you can actually win: small missions, real rewards, and a human coach in your corner when you need one.

Your first mission is ready. It takes about 10 minutes and you could unlock up to 5,000 reward points: complete your financial information and goals so we can map your way out.

${ctaLabel}:
${actionUrl}

WHAT HAPPENS NEXT
1. Complete your financial snapshot — see exactly where you stand.
2. Get your plan/goals — missions sized to your life, not someone else's.
3. Level up — every mission you clear unlocks rewards and moves you closer to freedom.

EASY WAYS TO EARN REWARDS
✓ Log in daily — every day counts.
✓ Track your mood — a minute a day.
✓ Track your expenses — small habit, big points.

YOUR FREE SESSION IS ON US
Money stress is human. Your signup includes a free one-on-one session with one of our Life Coaches / Counsellors — book it whenever you're ready.

We're glad you're here. One way out — forward.
The OneWayOut Team
Questions? Just reply to this email — a real person reads every one.

If you did not create this account, you can ignore this email.
${footer.text}`;

  const html = layout(
    `
    <span style="font-size:0;line-height:0;color:#ffffff;">${sendId}</span>
    <h2 style="margin-top:0;color:#1a1a1a;">Hi ${firstName},</h2>
    <p>You've just taken the hardest step — deciding that things are going to change. Welcome. You're in the right place.</p>
    <p>OneWayOut turns the road out of financial stress into a game you can actually win: small missions, real rewards, and a human coach in your corner when you need one.</p>
    <p><strong style="color:#2f6064;font-size:17px;font-weight:800;">Your first mission is ready.</strong> It takes about 10 minutes and you could unlock up to 5,000 reward points: complete your financial information and goals so we can map your way out.</p>
    ${primaryButtonHtml(actionUrl, ctaLabel)}
    ${creamSectionHtml(
      "What happens next",
      `<ol style="margin:0;padding-left:20px;color:#1a1a1a;font-size:14px;line-height:1.7;">
        <li style="margin-bottom:8px;">Complete your financial snapshot — see exactly where you stand.</li>
        <li style="margin-bottom:8px;">Get your plan/goals — missions sized to your life, not someone else's.</li>
        <li style="margin-bottom:0;">Level up — every mission you clear unlocks rewards and moves you closer to freedom.</li>
      </ol>`
    )}
    ${creamSectionHtml(
      "Easy ways to earn rewards",
      `<p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;">✓ Log in daily — every day counts.</p>
      <p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;">✓ Track your mood — a minute a day.</p>
      <p style="margin:0;color:#1a1a1a;font-size:14px;line-height:1.7;">✓ Track your expenses — small habit, big points.</p>`
    )}
    <div style="margin:24px 0;padding:24px 20px;background:#2f6064;border-radius:8px;text-align:center;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#fae3bb;text-align:center;">Your free session is on us</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#ffffff;text-align:center;">Money stress is human. Your signup includes a free one-on-one session with one of our Life Coaches / Counsellors — book it whenever you're ready.</p>
    </div>
    ${teamSignOffHtml()}
    <p style="font-size:13px;color:#777;">If you did not create this account, you can ignore this email.</p>
  `,
    { footerHtml: footer.html }
  );

  return { subject, html, text };
}

export function coachWelcomeEmail(params: {
  name: string;
  email: string;
  /** One-time Supabase recovery link. Must include the auth token — a bare /reset-password URL will not work. */
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const firstName = params.name.trim().split(/\s+/)[0] || "there";
  const resetUrl = params.resetUrl;
  const subject = "Welcome to OneWayOut — set up your coach account";
  const footer = companyFooter({
    reason: "You're receiving this because a coach account was created for you on OneWayOut.",
  });

  const text = `Hi ${firstName},

Your coach account on OneWayOut has been created.

Sign in with this email (${params.email}) and set your password here:
${resetUrl}

WHAT HAPPENS NEXT
1. Set your password with the button below.
2. Sign in to your coach portal.
3. Review upcoming sessions and support your clients.

This link expires for security. If it has expired, use Forgot password on the sign-in page.

${teamSignOffText()}

If you did not expect this email, you can ignore it.
${footer.text}`;

  const html = layout(
    `
    <h2 style="margin-top:0;color:#1a1a1a;">Hi ${firstName},</h2>
    <p>Your coach account on <strong>OneWayOut</strong> has been created.</p>
    <p><strong style="color:#2f6064;font-size:17px;font-weight:800;">Set your password to get started.</strong> Sign in with <strong>${params.email}</strong> after you choose a password.</p>
    ${primaryButtonHtml(resetUrl, "Set your password")}
    ${creamSectionHtml(
      "What happens next",
      `<ol style="margin:0;padding-left:20px;color:#1a1a1a;font-size:14px;line-height:1.7;">
        <li style="margin-bottom:8px;">Set your password with the button above.</li>
        <li style="margin-bottom:8px;">Sign in to your coach portal.</li>
        <li style="margin-bottom:0;">Review upcoming sessions and support your clients.</li>
      </ol>`
    )}
    <p style="font-size:13px;color:#777;">This link expires for security. If it has expired, use <em>Forgot password</em> on the sign-in page.</p>
    ${teamSignOffHtml()}
    <p style="font-size:13px;color:#777;">If you did not expect this email, you can ignore it.</p>
  `,
    {
      footerHtml: footer.html,
      headerTitle: "Welcome to OneWayOut",
      headerSubtitle: "Your coach account is ready — let's get you set up",
    }
  );

  return { subject, html, text };
}

export function appointmentConfirmationEmail(params: {
  userName: string;
  coachName: string;
  appointmentDate: string;
  appointmentTime: string;
  meetingLink?: string | null;
}): { subject: string; html: string; text: string } {
  const firstName = params.userName.trim().split(/\s+/)[0] || "there";
  const subject = `Appointment confirmed with ${params.coachName}`;
  const footer = companyFooter({
    reason: "You're receiving this because you booked a session on OneWayOut.",
  });
  const meetingLine = params.meetingLink ? `\nJoin: ${params.meetingLink}` : "";

  const text = `Hi ${firstName},

Your counseling appointment is confirmed.

Coach: ${params.coachName}
Date: ${params.appointmentDate}
Time: ${params.appointmentTime}${meetingLine}

${teamSignOffText()}
${footer.text}`;

  const meetingHtml = params.meetingLink
    ? primaryButtonHtml(params.meetingLink, "Join Teams meeting")
    : `<p style="font-size:14px;color:#555;text-align:center;">Your Teams link will be available in the portal before the session.</p>`;

  const html = layout(
    `
    <h2 style="margin-top:0;color:#1a1a1a;">Hi ${firstName},</h2>
    <p>Your session with <strong>${params.coachName}</strong> is booked.</p>
    ${creamSectionHtml(
      "Session details",
      `<p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Coach:</strong> ${params.coachName}</p>
      <p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Date:</strong> ${params.appointmentDate}</p>
      <p style="margin:0;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Time:</strong> ${params.appointmentTime}</p>`
    )}
    ${meetingHtml}
    ${teamSignOffHtml()}
  `,
    {
      footerHtml: footer.html,
      headerTitle: "Session confirmed",
      headerSubtitle: "You're one step closer — we look forward to seeing you",
    }
  );

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
  const firstName = params.coachName.trim().split(/\s+/)[0] || "there";
  const subject = `New session booked — ${params.userName}`;
  const footer = companyFooter({
    reason: "You're receiving this because a client booked a session with you on OneWayOut.",
  });
  const clientLine = params.userEmail
    ? `${params.userName} (${params.userEmail})`
    : params.userName;
  const meetingLine = params.meetingLink ? `\nJoin: ${params.meetingLink}` : "";

  const text = `Hi ${firstName},

A new coaching session has been booked.

Client: ${clientLine}
Date: ${params.appointmentDate}
Time: ${params.appointmentTime}${meetingLine}

The session has been added to your Outlook calendar.

${teamSignOffText()}
${footer.text}`;

  const meetingHtml = params.meetingLink
    ? primaryButtonHtml(params.meetingLink, "Join Teams meeting")
    : "";

  const html = layout(
    `
    <h2 style="margin-top:0;color:#1a1a1a;">Hi ${firstName},</h2>
    <p><strong style="color:#2f6064;font-size:17px;font-weight:800;">A new session has been booked.</strong></p>
    <p><strong>${clientLine}</strong> booked a session with you.</p>
    ${creamSectionHtml(
      "Session details",
      `<p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Client:</strong> ${clientLine}</p>
      <p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Date:</strong> ${params.appointmentDate}</p>
      <p style="margin:0;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Time:</strong> ${params.appointmentTime}</p>`
    )}
    ${meetingHtml}
    <p style="font-size:14px;color:#555;">This session is on your Outlook calendar.</p>
    ${teamSignOffHtml()}
  `,
    {
      footerHtml: footer.html,
      headerTitle: "New session booked",
      headerSubtitle: "A client is ready to meet with you",
    }
  );

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
  const firstName = params.recipientName.trim().split(/\s+/)[0] || "there";
  const subject = `Session cancelled — ${params.appointmentDate} ${params.appointmentTime}`;
  const footer = companyFooter({
    reason: "You're receiving this because a session on OneWayOut was cancelled.",
  });
  const cancelledByLine =
    params.cancelledBy === "user"
      ? `${params.userName} cancelled their session.`
      : "This session was cancelled.";

  const text = `Hi ${firstName},

${cancelledByLine}

Coach: ${params.coachName}
Client: ${params.userName}
Date: ${params.appointmentDate}
Time: ${params.appointmentTime}

${teamSignOffText()}
${footer.text}`;

  const html = layout(
    `
    <h2 style="margin-top:0;color:#1a1a1a;">Hi ${firstName},</h2>
    <p>${cancelledByLine}</p>
    ${creamSectionHtml(
      "Cancelled session",
      `<p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Coach:</strong> ${params.coachName}</p>
      <p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Client:</strong> ${params.userName}</p>
      <p style="margin:0 0 8px;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Date:</strong> ${params.appointmentDate}</p>
      <p style="margin:0;color:#1a1a1a;font-size:14px;line-height:1.7;"><strong>Time:</strong> ${params.appointmentTime}</p>`
    )}
    ${teamSignOffHtml()}
  `,
    {
      footerHtml: footer.html,
      headerTitle: "Session cancelled",
      headerSubtitle: "This booking is no longer on the calendar",
    }
  );

  return { subject, html, text };
}
