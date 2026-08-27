import { NextRequest, NextResponse } from "next/server";
import {
  enrichUsersWithRewardPoints,
  getUsersAdminContext,
  isComputedSortField,
  parseUserSortParams,
  sortPlatformUsers,
  type ProfileRowForQuery,
} from "@/lib/usersAdminApi";

const PROFILE_SELECT =
  "id, name, email, phone, role, status, monthly_income, onboarding_completed, user_points, created_at";

export async function GET(request: NextRequest) {
  const context = await getUsersAdminContext(request);
  if (context instanceof NextResponse) return context;

  const searchParams = request.nextUrl.searchParams;
  const search = (searchParams.get("search") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 10)));
  const { sortBy, sortOrder } = parseUserSortParams(
    searchParams.get("sortBy"),
    searchParams.get("sortOrder")
  );
  const from = (page - 1) * pageSize;

  let query = context.adminClient
    .from("profiles")
    .select(PROFILE_SELECT, { count: "exact" })
    .neq("role", "counselor");

  if (search) {
    const escapedSearch = search.replace(/[%_]/g, "");
    query = query.or(`name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`);
  }

  if (isComputedSortField(sortBy)) {
    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enriched = await enrichUsersWithRewardPoints(
      context.adminClient,
      (data ?? []) as ProfileRowForQuery[]
    );
    const sorted = sortPlatformUsers(enriched, sortBy, sortOrder);
    const total = count ?? sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const users = sorted.slice(from, from + pageSize);

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

  const dbColumn = sortBy === "createdAt" ? "created_at" : sortBy;
  query = query.order(dbColumn, { ascending: sortOrder === "asc" });

  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = await enrichUsersWithRewardPoints(
    context.adminClient,
    (data ?? []) as ProfileRowForQuery[]
  );
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
  const context = await getUsersAdminContext(request);
  if (context instanceof NextResponse) return context;

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    password?: string;
    monthlyIncome?: number;
    sendWelcomeEmail?: boolean;
    markOnboardingComplete?: boolean;
    onboarding?: {
      mood?: string;
      debtStatus?: string;
      savingsStatus?: string;
      investmentStatus?: string;
      incomeStability?: string;
      emergencyResilience?: string;
      primaryGoal?: string;
    };
  };

  try {
    const { createPlatformUser } = await import("@/lib/usersAdminCreate");
    const user = await createPlatformUser(context.adminClient, {
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      email: body.email ?? "",
      phone: body.phone,
      password: body.password ?? "",
      monthlyIncome: body.monthlyIncome,
      sendWelcomeEmail: body.sendWelcomeEmail,
      markOnboardingComplete: body.markOnboardingComplete,
      onboarding: body.onboarding,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user.";
    const status = message.toLowerCase().includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
