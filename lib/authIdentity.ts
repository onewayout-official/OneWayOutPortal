import type { SupabaseClient, User } from "@supabase/supabase-js";
import { formatE164 } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const SIGNUP_PHONE_TAKEN_ERROR =
  "This mobile number is already registered to another account. Please sign in instead.";

export const SIGNUP_EMAIL_TAKEN_ERROR =
  "This email address is already registered. Please sign in instead.";

export type SignupConflictField = "email" | "phone";

export interface SignupConflict {
  field: SignupConflictField;
  error: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByPhone(
  admin: SupabaseClient,
  phone: string
): Promise<User | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("phone", phone)
    .maybeSingle();

  if (profile?.id) {
    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    if (userData.user) return userData.user;
  }

  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) break;

    const match = data.users.find((u) => u.phone === phone);
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function findUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) break;

    const match = data.users.find(
      (u) => u.email?.trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profile?.id) {
    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    if (userData.user) return userData.user;
  }

  return null;
}

export async function findSignupConflict(
  options: {
    email?: string | null;
    phone?: string | null;
    excludeUserId?: string;
  },
  admin: SupabaseClient | null = getSupabaseAdmin()
): Promise<SignupConflict | null> {
  if (!admin) return null;

  const e164 = options.phone ? formatE164(options.phone) : undefined;
  const email = options.email?.trim() || undefined;

  if (e164) {
    const phoneOwner = await findUserByPhone(admin, e164);
    if (phoneOwner && phoneOwner.id !== options.excludeUserId) {
      return { field: "phone", error: SIGNUP_PHONE_TAKEN_ERROR };
    }
  }

  if (email) {
    const emailOwner = await findUserByEmail(admin, email);
    if (emailOwner && emailOwner.id !== options.excludeUserId) {
      return { field: "email", error: SIGNUP_EMAIL_TAKEN_ERROR };
    }
  }

  return null;
}
