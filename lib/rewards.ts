import { UserProfile } from "@/types";

export const SIGNUP_BONUS_POINTS = 100;

export function resolveUserPointsForProfile(
  profile: UserProfile,
  options?: { completingOnboarding?: boolean }
): number {
  const current = profile.userPoints ?? 0;
  if (current > 0) return current;
  if (options?.completingOnboarding) return SIGNUP_BONUS_POINTS;
  if (!profile.onboardingCompleted) return SIGNUP_BONUS_POINTS;
  return current;
}
