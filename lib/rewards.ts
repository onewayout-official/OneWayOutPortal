import { UserProfile } from "@/types";
import { SIGNUP_BONUS_POINTS } from "@/lib/gamification/config";

export { SIGNUP_BONUS_POINTS };

/** Display fallback when RPC balance is unavailable */
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
