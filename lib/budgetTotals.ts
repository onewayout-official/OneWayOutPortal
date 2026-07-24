import type { UserProfile } from "@/types";

export type AmountRow = { personal?: number | null };

/** Sum of budget income sources — same total shown on the Budget page. */
export function computePooledIncome(
  incomeList: AmountRow[],
  profile?: Pick<UserProfile, "monthlyIncome"> | null
): number {
  if (incomeList.length > 0) {
    return incomeList.reduce((sum, i) => sum + (Number(i.personal) || 0), 0);
  }
  return Number(profile?.monthlyIncome) || 0;
}

/** Sum of planned expense categories — same total shown on the Expenses page. */
export function computePooledExpenses(
  expenseList: AmountRow[],
  profile?: Pick<UserProfile, "lastExpenses"> | null
): number {
  if (expenseList.length > 0) {
    return expenseList.reduce((sum, e) => sum + (Number(e.personal) || 0), 0);
  }
  return Number(profile?.lastExpenses) || 0;
}