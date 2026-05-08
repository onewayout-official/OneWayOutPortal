import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  adminClient: ReturnType<typeof createClient>;
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

  return { adminClient };
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if (context instanceof NextResponse) return context;

  const searchParams = request.nextUrl.searchParams;
  const search = (searchParams.get("search") ?? "").trim();
  const role = (searchParams.get("role") ?? "all").trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 10)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = context.adminClient
    .from("profiles")
    .select(
      "id, name, email, phone, role, monthly_income, onboarding_completed, user_points, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    const escapedSearch = search.replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
  }
  if (role === "admin" || role === "user" || role === "counselor") {
    query = query.eq("role", role);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data as ProfileRow[]).map(toUserDto);
  const total = count ?? users.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext(request);
  if (context instanceof NextResponse) return context;

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

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const monthlyIncome = Number(body.monthlyIncome ?? 0);
  const userPoints = Number(body.userPoints ?? 0);
  const onboardingCompleted = Boolean(body.onboardingCompleted);
  const phone = body.phone?.trim() || null;
  const role = body.role === "admin" || body.role === "counselor" ? body.role : "user";

  const { data: createdUser, error: createUserError } =
    await context.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role },
    });

  if (createUserError || !createdUser.user) {
    return NextResponse.json(
      { error: createUserError?.message ?? "Failed to create auth user." },
      { status: 400 }
    );
  }

  const profileRow = {
    id: createdUser.user.id,
    name,
    email,
    phone,
    role,
    monthly_income: monthlyIncome,
    onboarding_completed: onboardingCompleted,
    user_points: userPoints,
    created_at: new Date().toISOString(),
  };

  const { error: upsertError } = await context.adminClient.from("profiles").upsert(profileRow);

  if (upsertError) {
    await context.adminClient.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ user: toUserDto(profileRow) }, { status: 201 });
}
