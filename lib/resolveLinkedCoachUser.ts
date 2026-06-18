import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeCoachLinkEmail(linkedUserEmail: unknown): string {
  return String(linkedUserEmail ?? "").trim().toLowerCase();
}

export async function resolveLinkedCoachUserId(
  adminClient: SupabaseClient,
  linkedUserEmail: unknown
): Promise<{ linkedUserId: string | null } | { error: string }> {
  const email = normalizeCoachLinkEmail(linkedUserEmail);
  if (!email) {
    return { linkedUserId: null };
  }

  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id, role, email")
    .ilike("email", email);

  if (error) {
    return { error: error.message };
  }

  const profile = (profiles ?? []).find(
    (row) => String((row as { email?: string }).email ?? "").trim().toLowerCase() === email
  ) as { id: string; role?: string } | undefined;

  if (!profile) {
    return {
      error:
        "No portal account found for that email. Leave this field blank to save the coach now, or create a user with the counselor role in Admin first.",
    };
  }

  if (profile.role !== "counselor") {
    return {
      error:
        "That account exists but is not a counselor. Set the user's role to counselor in Admin, then link them here.",
    };
  }

  return { linkedUserId: profile.id };
}
