import { NextRequest, NextResponse } from "next/server";
import { getUsersAdminContext, setUserSuspension, setUserVerifiedPhone } from "@/lib/usersAdminApi";
import { fetchRewardTotalPoints } from "@/lib/gamification/rewardPoints";
import { normalizeProfileStatus, type ProfileStatus } from "@/lib/profileStatus";

function toDetailDto(row: Record<string, unknown>, totalPoints: number) {
  const normalizedRole = row.role === "admin" ? "admin" : "user";

  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    firstName: (row.first_name as string) ?? "",
    lastName: (row.last_name as string) ?? "",
    email: (row.email as string) ?? "",
    phone: (row.phone as string) ?? null,
    role: normalizedRole,
    status: normalizeProfileStatus(row.status),
    monthlyIncome: Number(row.monthly_income ?? 0),
    savingsGoal: row.savings_goal != null ? Number(row.savings_goal) : null,
    onboardingCompleted: Boolean(row.onboarding_completed),
    onboardingSkipped: Boolean(row.onboarding_skipped),
    userPoints: Number(row.user_points ?? 0),
    totalPoints,
    walletBalance: totalPoints / 100,
    membership: (row.membership as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    mood: (row.mood as string) ?? null,
    capital: row.capital != null ? Number(row.capital) : null,
    debts: row.debts != null ? Number(row.debts) : null,
    lastIncome: row.last_income != null ? Number(row.last_income) : null,
    lastExpenses: row.last_expenses != null ? Number(row.last_expenses) : null,
    incomeGoals: row.income_goals != null ? Number(row.income_goals) : null,
    savingGoals: row.saving_goals != null ? Number(row.saving_goals) : null,
    debtStatus: (row.debt_status as string) ?? null,
    savingsStatus: (row.savings_status as string) ?? null,
    investmentStatus: (row.investment_status as string) ?? null,
    incomeStability: (row.income_stability as string) ?? null,
    emergencyResilience: (row.emergency_resilience as string) ?? null,
    primaryGoal: (row.primary_goal as string) ?? null,
    workNumber: (row.work_number as string) ?? null,
    homeNumber: (row.home_number as string) ?? null,
    workEmail: (row.work_email as string) ?? null,
    dateOfBirth: (row.date_of_birth as string) ?? null,
    occupation: (row.occupation as string) ?? null,
    employer: (row.employer as string) ?? null,
    gender: (row.gender as string) ?? null,
    maritalStatus: (row.marital_status as string) ?? null,
    bankName: (row.bank_name as string) ?? null,
    bankAccountType: (row.bank_account_type as string) ?? null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getUsersAdminContext(request);
  if (context instanceof NextResponse) return context;
  const { id } = await params;

  const { data: row, error } = await context.adminClient
    .from("profiles")
    .select("*")
    .eq("id", id)
    .neq("role", "counselor")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const totalPoints = await fetchRewardTotalPoints(context.adminClient, id);

  return NextResponse.json({ user: toDetailDto(row as Record<string, unknown>, totalPoints) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getUsersAdminContext(request);
  if (context instanceof NextResponse) return context;
  const { id } = await params;

  if (id === context.requesterUserId) {
    return NextResponse.json(
      { error: "You cannot change your own account status." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as { status?: string; phone?: string };
  const status: ProfileStatus | null =
    body.status === "suspended" ? "suspended" : body.status === "active" ? "active" : null;
  const phoneUpdate = body.phone?.trim();

  if (!status && !phoneUpdate) {
    return NextResponse.json(
      { error: "Provide a status and/or phone number to update." },
      { status: 400 }
    );
  }

  const { data: existing, error: readError } = await context.adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .neq("role", "counselor")
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  try {
    if (status) {
      await setUserSuspension(context.adminClient, id, status);
    }
    if (phoneUpdate) {
      await setUserVerifiedPhone(context.adminClient, id, phoneUpdate);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: row, error: fetchError } = await context.adminClient
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json(
      { error: fetchError?.message ?? "User updated but could not be reloaded." },
      { status: 500 }
    );
  }

  const totalPoints = await fetchRewardTotalPoints(context.adminClient, id);

  return NextResponse.json({ user: toDetailDto(row as Record<string, unknown>, totalPoints) });
}
