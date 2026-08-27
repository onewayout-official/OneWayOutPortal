import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isUsersAdminEmail } from "@/lib/usersAdmin";
import { fetchRewardTotalPoints } from "@/lib/gamification/rewardPoints";
import { normalizeProfileStatus, type ProfileStatus } from "@/lib/profileStatus";
import { formatE164, isValidPhone, PHONE_VALIDATION_HINT } from "@/lib/phone";

export interface UsersAdminContext {
  adminClient: SupabaseClient;
  requesterUserId: string;
}

export interface PlatformUserSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "admin" | "user";
  status: ProfileStatus;
  monthlyIncome: number;
  onboardingCompleted: boolean;
  userPoints: number;
  totalPoints: number;
  walletBalance: number;
  createdAt: string;
}

export type UserSortField =
  | "name"
  | "email"
  | "phone"
  | "walletBalance"
  | "totalPoints"
  | "createdAt";

export type SortOrder = "asc" | "desc";

const USER_SORT_FIELDS: UserSortField[] = [
  "name",
  "email",
  "phone",
  "walletBalance",
  "totalPoints",
  "createdAt",
];

export function parseUserSortParams(
  sortBy: string | null,
  sortOrder: string | null
): { sortBy: UserSortField; sortOrder: SortOrder } {
  const field = USER_SORT_FIELDS.includes(sortBy as UserSortField)
    ? (sortBy as UserSortField)
    : "createdAt";
  const order: SortOrder = sortOrder === "asc" ? "asc" : "desc";
  return { sortBy: field, sortOrder: order };
}

export function sortPlatformUsers(
  users: PlatformUserSummary[],
  sortBy: UserSortField,
  sortOrder: SortOrder
): PlatformUserSummary[] {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...users].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        break;
      case "email":
        comparison = a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
        break;
      case "phone":
        comparison = (a.phone ?? "").localeCompare(b.phone ?? "", undefined, {
          sensitivity: "base",
        });
        break;
      case "walletBalance":
        comparison = a.walletBalance - b.walletBalance;
        break;
      case "totalPoints":
        comparison = a.totalPoints - b.totalPoints;
        break;
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return comparison * direction;
  });
}

function isComputedSortField(sortBy: UserSortField): boolean {
  return sortBy === "walletBalance" || sortBy === "totalPoints";
}

export async function getUsersAdminContext(
  request: NextRequest
): Promise<UsersAdminContext | NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Users admin API not configured. Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const publicClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await publicClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isUsersAdminEmail(user.email)) {
    return NextResponse.json({ error: "You do not have access to the Users page." }, { status: 403 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { adminClient, requesterUserId: user.id };
}

export interface ProfileRowForQuery {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  monthly_income: number | null;
  onboarding_completed: boolean | null;
  user_points: number | null;
  created_at: string | null;
}

export function toPlatformUserSummary(
  row: ProfileRowForQuery,
  totalPoints: number
): PlatformUserSummary {
  const normalizedRole = row.role === "admin" ? "admin" : "user";

  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? null,
    role: normalizedRole,
    status: normalizeProfileStatus(row.status),
    monthlyIncome: Number(row.monthly_income ?? 0),
    onboardingCompleted: Boolean(row.onboarding_completed),
    userPoints: Number(row.user_points ?? 0),
    totalPoints,
    walletBalance: totalPoints / 100,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export async function enrichUsersWithRewardPoints(
  adminClient: SupabaseClient,
  rows: ProfileRowForQuery[]
): Promise<PlatformUserSummary[]> {
  const summaries = await Promise.all(
    rows.map(async (row) => {
      const totalPoints = await fetchRewardTotalPoints(adminClient, row.id);
      return toPlatformUserSummary(row, totalPoints);
    })
  );
  return summaries;
}

const EXPORT_PROFILE_SELECT =
  "id, name, email, phone, role, status, monthly_income, onboarding_completed, user_points, created_at";

export async function fetchAllPlatformUsers(
  adminClient: SupabaseClient,
  options: { sortBy: UserSortField; sortOrder: SortOrder }
): Promise<PlatformUserSummary[]> {
  const { sortBy, sortOrder } = options;

  let query = adminClient
    .from("profiles")
    .select(EXPORT_PROFILE_SELECT)
    .neq("role", "counselor");

  if (isComputedSortField(sortBy)) {
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const enriched = await enrichUsersWithRewardPoints(
      adminClient,
      (data ?? []) as ProfileRowForQuery[]
    );
    return sortPlatformUsers(enriched, sortBy, sortOrder);
  }

  const dbColumn = sortBy === "createdAt" ? "created_at" : sortBy;
  query = query.order(dbColumn, { ascending: sortOrder === "asc" });

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return enrichUsersWithRewardPoints(adminClient, (data ?? []) as ProfileRowForQuery[]);
}

export async function setUserSuspension(
  adminClient: SupabaseClient,
  userId: string,
  status: ProfileStatus
): Promise<void> {
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: status === "suspended" ? "876000h" : "none",
  });

  if (authError) {
    throw new Error(authError.message);
  }
}

export async function setUserVerifiedPhone(
  adminClient: SupabaseClient,
  userId: string,
  phone: string
): Promise<void> {
  const e164 = formatE164(phone);
  if (!e164 || !isValidPhone(e164)) {
    throw new Error(PHONE_VALIDATION_HINT);
  }

  const { data: authUserData } = await adminClient.auth.admin.getUserById(userId);
  const existingMeta = (authUserData.user?.user_metadata ?? {}) as Record<string, unknown>;

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ phone: e164 })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    phone: e164,
    phone_confirm: true,
    user_metadata: {
      ...existingMeta,
      phone: e164,
      phone_verified: true,
      admin_provisioned: true,
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }
}

export { isComputedSortField };
