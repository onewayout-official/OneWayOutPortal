import { profileHasPhone } from "@/lib/phone";

type AuthProfile = {
  role?: string | null;
  phone?: string | null;
  onboardingCompleted?: boolean;
  onboardingSkipped?: boolean;
} | null;

/** Where an authenticated member should go after login / OAuth callback. */
export function getPostAuthDestination(profile: AuthProfile): string {
  if (profile?.role === "counselor") return "/coach";
  if (!profileHasPhone(profile?.phone)) return "/complete-profile";
  if (profile?.onboardingCompleted || profile?.onboardingSkipped) return "/";
  return "/onboarding";
}
