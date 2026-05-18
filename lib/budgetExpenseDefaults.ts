import type { ExpenseCategory, RegistrationExpense } from "@/types";

export type BudgetExpenseRow = {
  id?: string;
  expenseCategory: string;
  expenseType: "Fixed" | "Variable";
  name: string;
  personal: number;
  total: number;
  points: number;
  namePlaceholder: string;
};

export const DEFAULT_BUDGET_EXPENSE_ROWS: BudgetExpenseRow[] = [
  { expenseCategory: "Company Pension", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 500, namePlaceholder: "Pension Fund Name" },
  { expenseCategory: "Tax", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 200, namePlaceholder: "NAMRA" },
  { expenseCategory: "Medical Aid", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 200, namePlaceholder: "Medical Aid Name" },
  { expenseCategory: "Investments", expenseType: "Variable", name: "", personal: 0, total: 0, points: 105, namePlaceholder: "Investment Name" },
  { expenseCategory: "Retirement Annuity", expenseType: "Variable", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Fund Name" },
  { expenseCategory: "Long Term Insurance", expenseType: "Variable", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Insurer Name" },
  { expenseCategory: "Short Term Insurance", expenseType: "Variable", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Insurer Name" },
  { expenseCategory: "Funeral Insurance", expenseType: "Variable", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Insurer Name" },
  { expenseCategory: "Bank Charges", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Bank Name" },
  { expenseCategory: "Personal Loan Payments", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
  { expenseCategory: "Home Loan Payments", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
  { expenseCategory: "Vehicle Loan Payments", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
  { expenseCategory: "Credit Card Payments", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Bank Name" },
  { expenseCategory: "Rental Expenses", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Property Name" },
  { expenseCategory: "Water & Electricity", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Property Name" },
  { expenseCategory: "Rates and Taxes", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Property Name" },
  { expenseCategory: "Groceries", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Various" },
  { expenseCategory: "Dining Out", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Lunch", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Subscriptions", expenseType: "Variable", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Various" },
  { expenseCategory: "Clothing Accounts", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Various" },
  { expenseCategory: "Fuel & Transport Expenses", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 50, namePlaceholder: "Various" },
  { expenseCategory: "Entertainment", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Domestic Staff Salary", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Staff Name" },
  { expenseCategory: "Garden Staff Salary", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Staff Name" },
  { expenseCategory: "Kids: School Fees", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
  { expenseCategory: "Kids: After Care", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
  { expenseCategory: "Kids: Extra Mural Activities", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
  { expenseCategory: "Kids: Maintenance", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
  { expenseCategory: "Maintenance: Car", expenseType: "Variable", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Various" },
  { expenseCategory: "Maintenance: House", expenseType: "Variable", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Various" },
  { expenseCategory: "Armed Response", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Company Name" },
  { expenseCategory: "Internet/Data", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Company Name" },
  { expenseCategory: "Airtime", expenseType: "Variable", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Company Name" },
  { expenseCategory: "Family: Extended", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Farm Expenses", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Donations", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Legal Expense", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Educations", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Medicine", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Administration", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Various" },
  { expenseCategory: "Vacations", expenseType: "Variable", name: "", personal: 0, total: 0, points: 10, namePlaceholder: "Destination" },
];

export function cloneDefaultBudgetExpenseRows(): BudgetExpenseRow[] {
  return DEFAULT_BUDGET_EXPENSE_ROWS.map((row) => ({ ...row }));
}

/** Merge saved/partial rows into the full default template (prefill amounts & names). */
export function mergeWithDefaultBudgetRows(saved: BudgetExpenseRow[]): BudgetExpenseRow[] {
  const defaults = cloneDefaultBudgetExpenseRows();
  const byCategory = new Map(saved.map((r) => [r.expenseCategory, r]));

  const merged = defaults.map((def) => {
    const match = byCategory.get(def.expenseCategory);
    if (match) {
      byCategory.delete(def.expenseCategory);
      const personal = match.personal || 0;
      return {
        ...def,
        id: match.id,
        name: match.name,
        personal,
        total: personal,
        points: match.points ?? def.points,
      };
    }
    return def;
  });

  for (const extra of byCategory.values()) {
    const personal = extra.personal || 0;
    merged.push({
      ...extra,
      total: personal,
      namePlaceholder: extra.namePlaceholder || extra.name || extra.expenseCategory,
    });
  }

  return merged;
}

/**
 * True when the user has not finished budget setup (empty DB, no amounts,
 * partial category list from legacy saves, or amount without required name).
 */
/** Row count persisted when user has only filled part of the template (legacy save filter). */
export const DEFAULT_BUDGET_EXPENSE_COUNT = DEFAULT_BUDGET_EXPENSE_ROWS.length;

export function isBudgetExpensesIncomplete(rows: BudgetExpenseRow[]): boolean {
  if (rows.length === 0) return true;

  const hasAnyAmount = rows.some((r) => (r.personal || 0) > 0);
  if (!hasAnyAmount) return true;

  return rows.some((r) => {
    if ((r.personal || 0) <= 0) return false;
    const placeholder = r.namePlaceholder || "";
    const expectsSpecificName = !/various/i.test(placeholder);
    return expectsSpecificName && !(r.name && r.name.trim());
  });
}

/** Whether stored budget rows represent a partial setup (not the full category list). */
export function isPartialBudgetSave(savedRowCount: number): boolean {
  return savedRowCount > 0 && savedRowCount < DEFAULT_BUDGET_EXPENSE_COUNT;
}

export function fromDisplayExpenseRows(
  rows: {
    id?: string;
    expenseCategory: string;
    expenseType: string;
    name: string;
    personal: number;
    total?: number;
    points: number;
    namePlaceholder?: string;
  }[]
): BudgetExpenseRow[] {
  return rows.map((e) => ({
    id: e.id,
    expenseCategory: e.expenseCategory,
    expenseType: e.expenseType === "Variable" ? "Variable" : "Fixed",
    name: e.name,
    personal: e.personal,
    total: e.total ?? e.personal,
    points: e.points,
    namePlaceholder: e.namePlaceholder || e.name || e.expenseCategory,
  }));
}

export function fromRegistrationExpenses(items: RegistrationExpense[]): BudgetExpenseRow[] {
  return items.map((e) => ({
    id: e.id,
    expenseCategory: e.category,
    expenseType: e.type === "Variable" ? "Variable" : "Fixed",
    name: e.name,
    personal: e.personal,
    total: e.personal,
    points: e.points,
    namePlaceholder: e.name || e.category,
  }));
}

export function toRegistrationExpenses(rows: BudgetExpenseRow[]): RegistrationExpense[] {
  return rows
    .filter((e) => e.personal > 0 || (e.name && e.name.trim() !== ""))
    .map((e) => ({
      id: e.id || crypto.randomUUID(),
      category: e.expenseCategory as ExpenseCategory,
      type: e.expenseType,
      name: (e.name && e.name.trim()) || e.expenseCategory,
      personal: e.personal,
      spouse: 0,
      points: e.points,
      editable: true,
    }));
}
