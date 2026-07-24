export const COACHES_ADMIN_EMAIL = "feroze104@gmail.com";

export function isCoachesAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === COACHES_ADMIN_EMAIL.toLowerCase();
}
