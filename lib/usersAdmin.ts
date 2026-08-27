export const USERS_ADMIN_EMAILS = ["feroze104@gmail.com", "paulg492@gmail.com"] as const;

export function isUsersAdminEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  return USERS_ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}
