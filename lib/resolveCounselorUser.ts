import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function randomPassword(length = 16) {
  return randomBytes(length).toString("base64url").slice(0, length);
}

async function findAuthUserByEmail(adminClient: SupabaseClient, email: string) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

export type ResolveCounselorUserResult =
  | { linkedUserId: null }
  | { linkedUserId: string; email: string; accountCreated: boolean }
  | { error: string };

export async function resolveOrCreateCounselorUser(
  adminClient: SupabaseClient,
  linkedUserEmail: unknown,
  coachName: string
): Promise<ResolveCounselorUserResult> {
  const email = String(linkedUserEmail ?? "").trim().toLowerCase();
  if (!email) {
    return { linkedUserId: null };
  }

  const name = coachName.trim() || email.split("@")[0];

  const { data: existingProfiles, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, email")
    .ilike("email", email)
    .limit(1);

  if (profileError) {
    return { error: profileError.message };
  }

  const existingProfile = existingProfiles?.[0] as
    | { id: string; role?: string | null }
    | undefined;

  if (existingProfile) {
    if (existingProfile.role !== "counselor") {
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({ role: "counselor", onboarding_completed: true })
        .eq("id", existingProfile.id);

      if (updateError) {
        return { error: updateError.message };
      }
    }

    return {
      linkedUserId: existingProfile.id,
      email,
      accountCreated: false,
    };
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { name, role: "counselor" },
  });

  if (!createError && createdUser.user) {
    const profileRow = {
      id: createdUser.user.id,
      name,
      email,
      role: "counselor",
      monthly_income: 0,
      onboarding_completed: true,
      user_points: 0,
      created_at: new Date().toISOString(),
    };

    const { error: upsertError } = await adminClient.from("profiles").upsert(profileRow);
    if (upsertError) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id);
      return { error: upsertError.message };
    }

    await adminClient.auth.admin.generateLink({ type: "recovery", email }).catch(() => undefined);

    return {
      linkedUserId: createdUser.user.id,
      email,
      accountCreated: true,
    };
  }

  const alreadyExists = createError?.message?.toLowerCase().includes("already");
  if (alreadyExists) {
    const authUser = await findAuthUserByEmail(adminClient, email);
    if (!authUser) {
      return {
        error:
          "An account with this email already exists but could not be linked. Update the user in Admin or use a different email.",
      };
    }

    const profileRow = {
      id: authUser.id,
      name,
      email,
      role: "counselor",
      monthly_income: 0,
      onboarding_completed: true,
      user_points: 0,
      created_at: new Date().toISOString(),
    };

    const { error: upsertError } = await adminClient.from("profiles").upsert(profileRow);
    if (upsertError) {
      return { error: upsertError.message };
    }

    return {
      linkedUserId: authUser.id,
      email,
      accountCreated: false,
    };
  }

  return { error: createError?.message ?? "Failed to create coach login account." };
}
