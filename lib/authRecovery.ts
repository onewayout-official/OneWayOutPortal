import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/siteUrl";

/** Builds a one-time recovery URL that lands on /reset-password with a valid auth session. */
export async function generatePasswordResetLink(
  adminClient: SupabaseClient,
  email: string
): Promise<{ resetUrl: string } | { error: string }> {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: getAppUrl("/reset-password"),
    },
  });

  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    return { error: error?.message ?? "Failed to generate password reset link." };
  }

  return { resetUrl: actionLink };
}
