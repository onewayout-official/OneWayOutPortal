import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/siteUrl";
import { sendEmail, isEmailConfigured, getAuthMailSender, getMailFromDisplayName } from "@/lib/email";
import { userWelcomeEmail } from "@/lib/emailTemplates";

export async function generateEmailConfirmLink(
  adminClient: SupabaseClient,
  email: string
): Promise<{ actionUrl: string } | { error: string }> {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: getAppUrl("/auth/callback"),
    },
  });

  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    return { error: error?.message ?? "Failed to generate confirmation link." };
  }

  return { actionUrl: actionLink };
}

/**
 * Sends a branded One Way Out welcome email via Graph/SMTP.
 * Does not throw — callers can ignore failures so signup still succeeds.
 */
export async function sendBrandedUserWelcome(params: {
  adminClient: SupabaseClient;
  email: string;
  name: string;
  needsConfirmation?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes("@") || email.endsWith("@phone.onewayout.local")) {
    return { success: false, error: "No deliverable email address." };
  }

  if (!isEmailConfigured()) {
    return { success: false, error: "Email is not configured." };
  }

  const needsConfirmation = Boolean(params.needsConfirmation);
  let actionUrl = getAppUrl("/login");

  if (needsConfirmation) {
    const linkResult = await generateEmailConfirmLink(params.adminClient, email);
    if ("error" in linkResult) {
      console.error("Welcome confirm link failed:", linkResult.error);
      return { success: false, error: linkResult.error };
    }
    actionUrl = linkResult.actionUrl;
  }

  const template = userWelcomeEmail({
    name: params.name.trim() || email.split("@")[0],
    email,
    actionUrl,
    needsConfirmation,
  });

  const sendResult = await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    fromMailbox: getAuthMailSender(),
    fromDisplayName: getMailFromDisplayName(),
  });

  if (!sendResult.success) {
    console.error("Branded welcome email failed:", sendResult.error);
  }

  return sendResult;
}
