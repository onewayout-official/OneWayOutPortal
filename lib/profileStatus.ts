export type ProfileStatus = "active" | "suspended";

export const PROFILE_SUSPENDED_MESSAGE =
  "Your account has been suspended. Please contact support for assistance.";

export function normalizeProfileStatus(value: unknown): ProfileStatus {
  return value === "suspended" ? "suspended" : "active";
}

export function isProfileSuspended(status: unknown): boolean {
  return normalizeProfileStatus(status) === "suspended";
}
