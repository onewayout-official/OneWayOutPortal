import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "admin" | "user" | "counselor" | null;
  monthly_income: number | null;
  onboarding_completed: boolean | null;
  user_points: number | null;
  created_at: string | null;
}

interface AdminContext {
  adminClient: SupabaseClient;
  requesterUserId: string;
}

function toUserDto(row: ProfileRow) {
  const normalizedRole =
    row.role === "admin" || row.role === "counselor" ? row.role : "user";

  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? null,
    role: normalizedRole as "admin" | "user" | "counselor",
    monthlyIncome: Number(row.monthly_income ?? 0),
    onboardingCompleted: Boolean(row.onboarding_completed),
    userPoints: Number(row.user_points ?? 0),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

async function getAdminContext(request: NextRequest): Promise<AdminContext | NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Admin API not configured. Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
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

  const allowList = (process.env.ADMIN_PANEL_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const requesterEmail = (user.email ?? "").toLowerCase();
  const isAllowedByEmail = allowList.includes(requesterEmail);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: requesterProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const roleFromProfile = (requesterProfile as { role?: string } | null)?.role ?? "user";
  const isAllowedByRole = roleFromProfile === "admin";

  if (!isAllowedByEmail && !isAllowedByRole) {
    return NextResponse.json({ error: "You do not have admin access." }, { status: 403 });
  }

  return { adminClient, requesterUserId: user.id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminContext(request);
  if (context instanceof NextResponse) return context;
  const { id } = await params;

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: "admin" | "user" | "counselor";
    monthlyIncome?: number;
    onboardingCompleted?: boolean;
    userPoints?: number;
    password?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone === undefined ? undefined : body.phone?.trim() || null;
  const role =
    body.role === undefined
      ? undefined
      : body.role === "admin" || body.role === "counselor"
        ? body.role
        : "user";
  const password = body.password?.trim();

  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const authUpdatePayload: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, string | null>;
  } = {};
  if (email) authUpdatePayload.email = email;
  if (password) authUpdatePayload.password = password;
  if (name !== undefined || phone !== undefined) {
    authUpdatePayload.user_metadata = {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(role !== undefined ? { role } : {}),
    };
  }

  if (Object.keys(authUpdatePayload).length > 0) {
    const { error: authUpdateError } = await context.adminClient.auth.admin.updateUserById(
      id,
      authUpdatePayload
    );
    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
    }
  }

  const profileUpdates: Record<string, unknown> = {};
  if (name !== undefined) profileUpdates.name = name;
  if (email !== undefined) profileUpdates.email = email;
  if (phone !== undefined) profileUpdates.phone = phone;
  if (role !== undefined) profileUpdates.role = role;
  if (body.monthlyIncome !== undefined) profileUpdates.monthly_income = Number(body.monthlyIncome);
  if (body.onboardingCompleted !== undefined) {
    profileUpdates.onboarding_completed = Boolean(body.onboardingCompleted);
  }
  if (body.userPoints !== undefined) profileUpdates.user_points = Number(body.userPoints);

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileUpdateError } = await context.adminClient
      .from("profiles")
      .update(profileUpdates)
      .eq("id", id);
    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }
  }

  const { data: row, error: readError } = await context.adminClient
    .from("profiles")
    .select("id, name, email, phone, role, monthly_income, onboarding_completed, user_points, created_at")
    .eq("id", id)
    .single();

  if (readError || !row) {
    return NextResponse.json({ error: readError?.message ?? "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: toUserDto(row as ProfileRow) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminContext(request);
  if (context instanceof NextResponse) return context;
  const { id } = await params;

  if (id === context.requesterUserId) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account from this screen." },
      { status: 400 }
    );
  }

  const { error } = await context.adminClient.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
