import type { SupabaseClient } from "@supabase/supabase-js";
import { findSignupConflict } from "@/lib/authIdentity";
import { formatE164, isValidPhone, PHONE_VALIDATION_HINT } from "@/lib/phone";
import {
  computeMembershipTier,
  isOnboardingComplete,
  normalizeOnboardingStep,
  ONBOARDING_TOTAL_STEPS,
  type OnboardingAnswers,
} from "@/lib/onboarding";
import type {
  DebtStatus,
  EmergencyResilience,
  IncomeStability,
  InvestmentStatus,
  OnboardingMood,
  PrimaryGoal,
  SavingsStatus,
} from "@/types";
import { sendBrandedUserWelcome } from "@/lib/userWelcome";

export interface CreatePlatformUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  password: string;
  monthlyIncome?: number;
  sendWelcomeEmail?: boolean;
  onboarding?: Record<string, string | undefined>;
  markOnboardingComplete?: boolean;
}

function parseOnboardingInput(raw?: Record<string, string | undefined>): OnboardingAnswers {
  return {
    mood: (raw?.mood as OnboardingMood | undefined) ?? null,
    debtStatus: (raw?.debtStatus as DebtStatus | undefined) ?? null,
    savingsStatus: (raw?.savingsStatus as SavingsStatus | undefined) ?? null,
    investmentStatus: (raw?.investmentStatus as InvestmentStatus | undefined) ?? null,
    incomeStability: (raw?.incomeStability as IncomeStability | undefined) ?? null,
    emergencyResilience: (raw?.emergencyResilience as EmergencyResilience | undefined) ?? null,
    primaryGoal: (raw?.primaryGoal as PrimaryGoal | undefined) ?? null,
  };
}

export interface CreatedPlatformUser {
  id: string;
  name: string;
  email: string;
}

export async function createPlatformUser(
  adminClient: SupabaseClient,
  input: CreatePlatformUserInput
): Promise<CreatedPlatformUser> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const name = `${firstName} ${lastName}`.trim();
  const phoneRaw = input.phone?.trim() || null;
  const e164 = phoneRaw ? formatE164(phoneRaw) : undefined;

  if (!firstName || !lastName || !email || !password) {
    throw new Error("First name, last name, email, and password are required.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  if (!phoneRaw) {
    throw new Error("Mobile number is required.");
  }
  if (!e164 || !isValidPhone(e164)) {
    throw new Error(PHONE_VALIDATION_HINT);
  }

  const conflict = await findSignupConflict({ email, phone: e164 }, adminClient);
  if (conflict) {
    throw new Error(conflict.error);
  }

  const onboardingAnswers = parseOnboardingInput(input.onboarding);

  const markOnboardingComplete = Boolean(input.markOnboardingComplete);
  if (markOnboardingComplete && !isOnboardingComplete(onboardingAnswers)) {
    throw new Error("Complete all onboarding steps before marking onboarding as complete.");
  }

  const answeredSteps = [
    onboardingAnswers.mood,
    onboardingAnswers.debtStatus,
    onboardingAnswers.savingsStatus,
    onboardingAnswers.investmentStatus,
    onboardingAnswers.incomeStability,
    onboardingAnswers.emergencyResilience,
    onboardingAnswers.primaryGoal,
  ].filter((value) => value != null).length;

  const onboardingStep = markOnboardingComplete
    ? ONBOARDING_TOTAL_STEPS
    : normalizeOnboardingStep(answeredSteps || 1);

  const membership = markOnboardingComplete
    ? computeMembershipTier(onboardingAnswers)
    : "Debt Crusher";

  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    phone: e164,
    phone_confirm: true,
    user_metadata: {
      name,
      first_name: firstName,
      last_name: lastName,
      phone: e164,
      role: "user",
      phone_verified: true,
      admin_provisioned: true,
    },
  });

  if (createUserError || !createdUser.user) {
    throw new Error(createUserError?.message ?? "Failed to create auth user.");
  }

  const profileRow = {
    id: createdUser.user.id,
    name,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: e164,
    role: "user",
    status: "active",
    monthly_income: Number(input.monthlyIncome ?? 0),
    user_points: 0,
    onboarding_mood: onboardingAnswers.mood,
    debt_status: onboardingAnswers.debtStatus,
    savings_status: onboardingAnswers.savingsStatus,
    investment_status: onboardingAnswers.investmentStatus,
    income_stability: onboardingAnswers.incomeStability,
    emergency_resilience: onboardingAnswers.emergencyResilience,
    primary_goal: onboardingAnswers.primaryGoal,
    membership,
    onboarding_step: onboardingStep,
    onboarding_completed: markOnboardingComplete,
    onboarding_skipped: false,
    created_at: new Date().toISOString(),
  };

  const { error: upsertError } = await adminClient.from("profiles").upsert(profileRow);

  if (upsertError) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    throw new Error(upsertError.message);
  }

  if (input.sendWelcomeEmail !== false) {
    void sendBrandedUserWelcome({
      adminClient,
      email,
      name,
      needsConfirmation: false,
    });
  }

  return {
    id: createdUser.user.id,
    name,
    email,
  };
}
