/** Account balance math shared by BudgetManager (left sidebar) and Dashboard (Cash is king cards). */

export type BudgetAccountBalanceInput = {
  userAccounts: { id: string; accountType: string; name: string }[];
  income: { id: string; personal?: number | null }[];
  incomeAllocations: { incomeId: string; accountId: string; amount: number }[];
  accountExpenseAllocations: { accountId: string; expenseId: string; amount: number }[];
  accountTransfers: { fromAccountId: string; toAccountId: string; amount: number }[];
  expenses: { date: string | Date; amount: number; accountId?: string | null }[];
  walletBalance?: number;
};

/** Same order and labels as BudgetManager ACCOUNT_TYPE_META. */
export const ACCOUNT_TYPE_BALANCE_META: { type: string; label: string }[] = [
  { type: "bank", label: "Bank" },
  { type: "savings", label: "Savings" },
  { type: "investment", label: "Investment" },
  { type: "cash", label: "Cash" },
  { type: "wallet", label: "Wallet" },
];

/**
 * Per-account "left" balance: income + transfer in − transfer out − spent − budgeted.
 * Mirrors BudgetManager.getAccountTotal().
 */
export function computeAccountBalancesById(input: BudgetAccountBalanceInput): Map<string, number> {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const incomeByAccount = new Map<string, number>();
  for (const alloc of input.incomeAllocations) {
    const flowAmount = Number(alloc.amount) || 0;
    if (flowAmount <= 0) continue;
    incomeByAccount.set(alloc.accountId, (incomeByAccount.get(alloc.accountId) ?? 0) + flowAmount);
  }

  const budgetedByAccount = new Map<string, number>();
  for (const alloc of input.accountExpenseAllocations) {
    budgetedByAccount.set(alloc.accountId, (budgetedByAccount.get(alloc.accountId) ?? 0) + (alloc.amount || 0));
  }

  const spentByAccount = new Map<string, number>();
  for (const exp of input.expenses) {
    const d = new Date(exp.date);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && exp.accountId) {
      spentByAccount.set(exp.accountId, (spentByAccount.get(exp.accountId) ?? 0) + (exp.amount || 0));
    }
  }

  const transferOutByAccount = new Map<string, number>();
  const transferInByAccount = new Map<string, number>();
  for (const t of input.accountTransfers) {
    transferOutByAccount.set(t.fromAccountId, (transferOutByAccount.get(t.fromAccountId) ?? 0) + (t.amount || 0));
    transferInByAccount.set(t.toAccountId, (transferInByAccount.get(t.toAccountId) ?? 0) + (t.amount || 0));
  }

  const balances = new Map<string, number>();
  for (const acc of input.userAccounts) {
    if (acc.accountType === "wallet") continue;
    const total =
      (incomeByAccount.get(acc.id) ?? 0) +
      (transferInByAccount.get(acc.id) ?? 0) -
      (transferOutByAccount.get(acc.id) ?? 0) -
      (spentByAccount.get(acc.id) ?? 0) -
      (budgetedByAccount.get(acc.id) ?? 0);
    balances.set(acc.id, total);
  }

  return balances;
}

/** Sum per-account balances by type; wallet uses rewards available balance (not user_accounts). */
export function computeAccountTypeBalances(
  input: BudgetAccountBalanceInput
): { type: string; total: number }[] {
  const byAccount = computeAccountBalancesById(input);

  return ACCOUNT_TYPE_BALANCE_META.map(({ type, label }) => {
    if (type === "wallet") {
      return { type: label, total: input.walletBalance ?? 0 };
    }

    const accountsOfType = input.userAccounts.filter((a) => a.accountType === type);
    const total = accountsOfType.reduce((sum, acc) => sum + (byAccount.get(acc.id) ?? 0), 0);
    return { type: label, total };
  });
}
