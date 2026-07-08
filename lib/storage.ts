import {
  UserProfile,
  Expense,
  Debt,
  AuthSession,
  Asset,
  DailyMood,
  Income,
  RegistrationExpense,
  Liability,
  SpendCategory,
} from "@/types";
import { supabase } from "@/lib/supabase";
import { formatE164 } from "@/lib/phone";
import { SIGNUP_BONUS_POINTS } from "@/lib/gamification/config";
import { tryAwardTask } from "@/lib/gamification/rewards";
import { computeAccountTypeBalances } from "@/lib/budgetAccountBalances";

/** Get current Supabase user id (async). */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Get session in app shape — uses getUser() to verify JWT server-side (fix #13). */
export async function getSession(): Promise<AuthSession | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  // Retrieve expiry from the local session (getUser doesn't return it)
  const { data: { session } } = await supabase.auth.getSession();
  return {
    userId: user.id,
    email: user.email ?? "",
    expiresAt: session?.expires_at ? session.expires_at * 1000 : 0,
  };
}

/** Normalize Postgres `date` / ISO strings to `yyyy-MM-dd` for consistent app comparisons */
function normalizePgDateKey(d: string): string {
  if (!d) return "";
  const s = String(d).trim();
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}

function splitNameParts(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function readCrmProfileData(value: unknown): UserProfile["crmProfileData"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) =>
    typeof item === "string" || typeof item === "number" || typeof item === "boolean"
  );
  return entries.length > 0 ? Object.fromEntries(entries) as UserProfile["crmProfileData"] : undefined;
}

type BudgetManagerData = {
  profile: UserProfile | null;
  expenses: Expense[];
  income: Income[];
  budgetExpenses: RegistrationExpense[];
  userAccounts: { id: string; accountType: string; name: string; sortOrder: number }[];
  incomeAllocations: { incomeId: string; accountId: string; amount: number }[];
  accountExpenseAllocations: { accountId: string; expenseId: string; amount: number }[];
  accountTransfers: { fromAccountId: string; toAccountId: string; amount: number }[];
  availableWalletBalance: number;
  accountTypeBalances: { type: string; total: number }[];
  fromCache?: boolean;
};

const BUDGET_MANAGER_CACHE_TTL_MS = 2 * 60 * 1000;
const BUDGET_MANAGER_CACHE_PREFIX = "onewayout:budget-manager:v2:";

function getBudgetManagerCacheKey(userId: string): string {
  return `${BUDGET_MANAGER_CACHE_PREFIX}${userId}`;
}

function readBudgetManagerCache(userId: string): BudgetManagerData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(getBudgetManagerCacheKey(userId));
    if (!raw) return null;

    const cached = JSON.parse(raw) as { cachedAt?: unknown; data?: unknown };
    if (typeof cached.cachedAt !== "number" || Date.now() - cached.cachedAt > BUDGET_MANAGER_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(getBudgetManagerCacheKey(userId));
      return null;
    }

    if (!cached.data || typeof cached.data !== "object") return null;
    return { ...(cached.data as BudgetManagerData), fromCache: true };
  } catch {
    window.sessionStorage.removeItem(getBudgetManagerCacheKey(userId));
    return null;
  }
}

function writeBudgetManagerCache(userId: string, data: BudgetManagerData): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      getBudgetManagerCacheKey(userId),
      JSON.stringify({
        cachedAt: Date.now(),
        data: { ...data, fromCache: false },
      })
    );
  } catch {
    // Ignore storage quota/private mode failures; network data has already loaded.
  }
}

function clearBudgetManagerCache(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(BUDGET_MANAGER_CACHE_PREFIX)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Cache invalidation should never block the user's budget action.
  }
}

export const storage = {
  // Session (delegates to Supabase Auth)
  getSession,

  clearSession: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  getCurrentUserId,

  // Profile
  getProfile: async (): Promise<UserProfile | null> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;
    const userId = authUser.id;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    // If no profile exists (e.g. trigger didn't run or user created before migration), create one
    if (!data) {
      const authUserPhone = (authUser as { phone?: string }).phone ?? null;
      const metadataName = (authUser.user_metadata?.name as string) || "";
      const metadataFirstName = (authUser.user_metadata?.first_name as string) || "";
      const metadataLastName = (authUser.user_metadata?.last_name as string) || "";
      const fallbackNameParts = splitNameParts(metadataName);
      const firstName = metadataFirstName || fallbackNameParts.firstName;
      const lastName = metadataLastName || fallbackNameParts.lastName;
      await supabase.from("profiles").upsert({
        id: userId,
        name: metadataName || `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        email: authUser.email ?? "",
        phone: authUserPhone,
        monthly_income: 0,
        savings_goal: null,
        created_at: new Date().toISOString(),
        mood: null,
        capital: null,
        debts: null,
        last_income: null,
        last_expenses: null,
        income_goals: null,
        saving_goals: null,
        onboarding_completed: false,
        onboarding_skipped: false,
        user_points: SIGNUP_BONUS_POINTS,
      });
      const { data: inserted } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return inserted ? mapRowToProfile(inserted) : null;
    }
    if (error || !data) return null;
    return mapRowToProfile(data);
  },

  saveProfile: async (profile: UserProfile): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const fallbackNameParts = splitNameParts(profile.name ?? "");
    const firstName = (profile.firstName ?? fallbackNameParts.firstName).trim();
    const lastName = (profile.lastName ?? fallbackNameParts.lastName).trim();
    const fullName = profile.name?.trim() || `${firstName} ${lastName}`.trim();
    const normalizedPhone = profile.phone?.trim()
      ? formatE164(profile.phone) ?? profile.phone.trim()
      : null;
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      initials: profile.initials ?? null,
      email: profile.email,
      phone: normalizedPhone,
      monthly_income: profile.monthlyIncome,
      savings_goal: profile.savingsGoal ?? null,
      created_at: profile.createdAt,
      mood: profile.mood ?? null,
      capital: profile.capital ?? null,
      debts: profile.debts ?? null,
      last_income: profile.lastIncome ?? null,
      last_expenses: profile.lastExpenses ?? null,
      income_goals: profile.incomeGoals ?? null,
      saving_goals: profile.savingGoals ?? null,
      onboarding_completed: profile.onboardingCompleted ?? false,
      onboarding_skipped: profile.onboardingSkipped ?? false,
      membership: profile.membership ?? "Debt Crusher",
      onboarding_step: profile.onboardingStep ?? 1,
      onboarding_mood: profile.onboardingMood ?? null,
      debt_status: profile.debtStatus ?? null,
      savings_status: profile.savingsStatus ?? null,
      investment_status: profile.investmentStatus ?? null,
      income_stability: profile.incomeStability ?? null,
      emergency_resilience: profile.emergencyResilience ?? null,
      primary_goal: profile.primaryGoal ?? null,
      work_number: profile.workNumber ?? null,
      home_number: profile.homeNumber ?? null,
      work_email: profile.workEmail ?? null,
      date_of_birth: profile.dateOfBirth ?? null,
      date_of_marriage: profile.dateOfMarriage ?? null,
      id_number: profile.idNumber ?? null,
      tax_number: profile.taxNumber ?? null,
      occupation: profile.occupation ?? null,
      employer: profile.employer ?? null,
      highest_qualification: profile.highestQualification ?? null,
      gender: profile.gender ?? null,
      marital_status: profile.maritalStatus ?? "unknown",
      source_of_wealth: profile.sourceOfWealth ?? null,
      industry_classification: profile.industryClassification ?? null,
      bank_account_holder: profile.bankAccountHolder ?? null,
      bank_code: profile.bankCode ?? null,
      bank_name: profile.bankName ?? null,
      bank_branch_code: profile.bankBranchCode ?? null,
      bank_account_type: profile.bankAccountType ?? null,
      bank_account_number: profile.bankAccountNumber ?? null,
      crm_profile_data: profile.crmProfileData ?? {},
    });
    if (error) {
      if (error.code === "23505" && error.message.includes("profiles_phone_unique")) {
        throw new Error("This mobile number is already registered to another account.");
      }
      console.error("[storage] saveProfile error:", error.message);
      throw error;
    }
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRowToExpense);
  },

  saveExpenses: async (expenses: Expense[]): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    // Delete only items not in the new list to avoid delete-then-insert data loss (fix #2)
    const { error: delError } = await supabase
      .from("expenses")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", expenses.length > 0 ? `(${expenses.map((e) => `'${e.id}'`).join(",")})` : "('')");
    if (delError) console.error("[storage] saveExpenses delete error:", delError.message);
    if (expenses.length === 0) return;
    const { error: upsertError } = await supabase.from("expenses").upsert(
      expenses.map((e) => ({
        id: e.id,
        user_id: userId,
        title: e.title,
        amount: e.amount,
        category: e.category,
        date: e.date,
        description: e.description ?? null,
        account_id: e.accountId ?? null,
      })),
      { onConflict: "id" }
    );
    if (upsertError) console.error("[storage] saveExpenses upsert error:", upsertError.message);
  },

  addExpense: async (expense: Expense): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from("expenses").insert({
      id: expense.id,
      user_id: userId,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      description: expense.description ?? null,
      account_id: expense.accountId ?? null,
    });
    const expenseDate = normalizePgDateKey(expense.date);
    await tryAwardTask("expense-log", { localDate: expenseDate });
  },

  deleteExpense: async (id: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    // Always scope deletes to the current user (fix #3)
    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);
    if (error) console.error("[storage] deleteExpense error:", error.message);
  },

  // Debts
  getDebts: async (): Promise<Debt[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRowToDebt);
  },

  saveDebts: async (debts: Debt[]): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    // Safe upsert: delete only rows not in the new list (fix #2)
    const { error: delError } = await supabase
      .from("debts")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", debts.length > 0 ? `(${debts.map((d) => `'${d.id}'`).join(",")})` : "('')");
    if (delError) console.error("[storage] saveDebts delete error:", delError.message);
    if (debts.length === 0) return;
    const { error: upsertError } = await supabase.from("debts").upsert(
      debts.map((d) => ({
        id: d.id,
        user_id: userId,
        name: d.name,
        total_amount: d.totalAmount,
        remaining_amount: d.remainingAmount,
        interest_rate: d.interestRate,
        minimum_payment: d.minimumPayment,
        due_date: d.dueDate,
        type: d.type,
        created_at: d.createdAt,
      })),
      { onConflict: "id" }
    );
    if (upsertError) console.error("[storage] saveDebts upsert error:", upsertError.message);
  },

  addDebt: async (debt: Debt): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from("debts").insert({
      id: debt.id,
      user_id: userId,
      name: debt.name,
      total_amount: debt.totalAmount,
      remaining_amount: debt.remainingAmount,
      interest_rate: debt.interestRate,
      minimum_payment: debt.minimumPayment,
      due_date: debt.dueDate,
      type: debt.type,
      created_at: debt.createdAt,
    });
  },

  updateDebt: async (id: string, updates: Partial<Debt>): Promise<void> => {
    const row: Record<string, unknown> = {};
    if (updates.remainingAmount !== undefined) row.remaining_amount = updates.remainingAmount;
    if (updates.minimumPayment !== undefined) row.minimum_payment = updates.minimumPayment;
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.totalAmount !== undefined) row.total_amount = updates.totalAmount;
    if (updates.interestRate !== undefined) row.interest_rate = updates.interestRate;
    if (updates.dueDate !== undefined) row.due_date = updates.dueDate;
    if (updates.type !== undefined) row.type = updates.type;
    if (Object.keys(row).length === 0) return;
    await supabase.from("debts").update(row).eq("id", id);
  },

  deleteDebt: async (id: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", userId);
    if (error) console.error("[storage] deleteDebt error:", error.message);
  },

  // Assets
  getAssets: async (): Promise<Asset[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId);
    if (error) return [];
    return (data ?? []).map(mapRowToAsset);
  },

  saveAssets: async (assets: Asset[]): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    // Safe upsert: delete only rows not in the new list (fix #2)
    const { error: delError } = await supabase
      .from("assets")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", assets.length > 0 ? `(${assets.map((a) => `'${a.id}'`).join(",")})` : "('')");
    if (delError) console.error("[storage] saveAssets delete error:", delError.message);
    if (assets.length === 0) return;
    const { error: upsertError } = await supabase.from("assets").upsert(
      assets.map((a) => ({
        id: a.id,
        user_id: userId,
        category: a.category,
        type: a.type,
        name: a.name,
        personal: a.personal,
        spouse: a.spouse,
        points: a.points,
        interest_rate: a.interestRate,
        editable: a.editable ?? true,
      })),
      { onConflict: "id" }
    );
    if (upsertError) console.error("[storage] saveAssets upsert error:", upsertError.message);
  },

  addAsset: async (asset: Asset): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from("assets").insert({
      id: asset.id,
      user_id: userId,
      category: asset.category,
      type: asset.type,
      name: asset.name,
      personal: asset.personal,
      spouse: asset.spouse,
      points: asset.points,
      interest_rate: asset.interestRate,
      editable: asset.editable ?? true,
    });
  },

  updateAsset: async (id: string, updates: Partial<Asset>): Promise<void> => {
    const row: Record<string, unknown> = {};
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.type !== undefined) row.type = updates.type;
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.personal !== undefined) row.personal = updates.personal;
    if (updates.spouse !== undefined) row.spouse = updates.spouse;
    if (updates.points !== undefined) row.points = updates.points;
    if (updates.interestRate !== undefined) row.interest_rate = updates.interestRate;
    if (updates.editable !== undefined) row.editable = updates.editable;
    if (Object.keys(row).length === 0) return;
    await supabase.from("assets").update(row).eq("id", id);
  },

  deleteAsset: async (id: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { error } = await supabase.from("assets").delete().eq("id", id).eq("user_id", userId);
    if (error) console.error("[storage] deleteAsset error:", error.message);
  },

  // Liabilities (onboarding / registration liabilities)
  getLiabilities: async (): Promise<Liability[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("liabilities")
      .select("*")
      .eq("user_id", userId);
    if (error) return [];
    return (data ?? []).map(mapRowToLiability);
  },

  saveLiabilities: async (items: Liability[]): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { error: delError } = await supabase
      .from("liabilities")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", items.length > 0 ? `(${items.map((l) => `'${l.id}'`).join(",")})` : "('')");
    if (delError) console.error("[storage] saveLiabilities delete error:", delError.message);
    if (items.length === 0) return;
    const { error: upsertError } = await supabase.from("liabilities").upsert(
      items.map((l) => ({
        id: l.id,
        user_id: userId,
        category: l.category,
        type: l.type,
        name: l.name,
        personal: l.personal,
        spouse: l.spouse,
        points: l.points,
        interest_rate: l.interestRate,
        editable: l.editable ?? true,
      })),
      { onConflict: "id" }
    );
    if (upsertError) console.error("[storage] saveLiabilities upsert error:", upsertError.message);
  },

  // Income (onboarding / registration income sources)
  getIncome: async (): Promise<Income[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("income")
      .select("*")
      .eq("user_id", userId);
    if (error) return [];
    return (data ?? []).map(mapRowToIncome);
  },

  saveIncome: async (items: Income[]): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { error: delError } = await supabase
      .from("income")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", items.length > 0 ? `(${items.map((i) => `'${i.id}'`).join(",")})` : "('')");
    if (delError) console.error("[storage] saveIncome delete error:", delError.message);
    if (items.length === 0) return;
    const { error: upsertError } = await supabase.from("income").upsert(
      items.map((i) => ({
        id: i.id,
        user_id: userId,
        category: i.category,
        type: i.type,
        name: i.name,
        personal: i.personal,
        spouse: i.spouse,
        points: i.points,
        editable: i.editable ?? true,
      })),
      { onConflict: "id" }
    );
    if (upsertError) console.error("[storage] saveIncome upsert error:", upsertError.message);
  },

  // Budget expenses (onboarding / registration expense categories)
  getBudgetExpenses: async (): Promise<RegistrationExpense[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("budget_expenses")
      .select("*")
      .eq("user_id", userId);
    if (error) return [];
    return (data ?? []).map(mapRowToRegistrationExpense);
  },

  saveBudgetExpenses: async (items: RegistrationExpense[]): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { error: delError } = await supabase
      .from("budget_expenses")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", items.length > 0 ? `(${items.map((e) => `'${e.id}'`).join(",")})` : "('')");
    if (delError) console.error("[storage] saveBudgetExpenses delete error:", delError.message);
    if (items.length === 0) return;
    const { error: upsertError } = await supabase.from("budget_expenses").upsert(
      items.map((e) => ({
        id: e.id,
        user_id: userId,
        category: e.category,
        type: e.type,
        name: e.name,
        personal: e.personal,
        spouse: e.spouse,
        points: e.points,
        editable: e.editable ?? true,
      })),
      { onConflict: "id" }
    );
    if (upsertError) {
      console.error("[storage] saveBudgetExpenses upsert error:", upsertError.message);
      return;
    }
    await tryAwardTask("monthly-budget-update");
  },

  /** Spend screen: budget amount per category (from budget_expenses where category is one of the 7). */
  getSpendBudgets: async (): Promise<Record<SpendCategory, number>> => {
    const all = await storage.getBudgetExpenses();
    const budgets = { Grocery: 0, Fuel: 0, Electricity: 0, Airtime: 0, Water: 0, Rent: 0, Transport: 0, "Send to others": 0 } as Record<SpendCategory, number>;
    const spendCategories: SpendCategory[] = ["Grocery", "Fuel", "Electricity", "Airtime", "Water", "Rent", "Transport", "Send to others"];
    for (const row of all) {
      if (spendCategories.includes(row.category as SpendCategory)) {
        budgets[row.category as SpendCategory] = Number(row.personal) + Number(row.spouse);
      }
    }
    return budgets;
  },

  /** Spend screen: save budget for the 7 categories (merges with existing budget_expenses). */
  saveSpendBudgets: async (budgets: Record<SpendCategory, number>): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const all = await storage.getBudgetExpenses();
    const spendCategories: SpendCategory[] = ["Grocery", "Fuel", "Electricity", "Airtime", "Water", "Rent", "Transport", "Send to others"];
    const other = all.filter((e) => !spendCategories.includes(e.category as SpendCategory));
    const spendRows: RegistrationExpense[] = spendCategories.map((cat, i) => ({
      id: `spend-${cat}-${userId}`,
      category: cat,
      type: "Variable",
      name: cat,
      personal: budgets[cat],
      spouse: 0,
      points: 0,
      editable: true,
    }));
    await storage.saveBudgetExpenses([...other, ...spendRows]);
  },

  // Daily Moods
  getDailyMoods: async (): Promise<DailyMood[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("daily_moods")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) {
      console.error("[storage] getDailyMoods error:", error.message);
      return [];
    }
    return (data ?? []).map((r: { date: string; mood: string }) => ({
      date: normalizePgDateKey(r.date),
      mood: r.mood as DailyMood["mood"],
    }));
  },

  saveDailyMood: async (mood: DailyMood): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error("You must be signed in to save your mood.");
    }
    const dateKey = normalizePgDateKey(mood.date);
    const { error } = await supabase.from("daily_moods").upsert(
      { user_id: userId, date: dateKey, mood: mood.mood },
      { onConflict: "user_id,date" }
    );
    if (error) {
      console.error("[storage] saveDailyMood error:", error.message);
      throw new Error(error.message);
    }
    await tryAwardTask("daily-mood", { localDate: dateKey });
  },

  // User Accounts (dynamic accounts per type)
  getUserAccounts: async (): Promise<{ id: string; accountType: string; name: string; sortOrder: number }[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("user_accounts")
      .select("id, account_type, name, sort_order")
      .eq("user_id", userId)
      .order("sort_order")
      .order("created_at");
    if (error) {
      console.error("[storage] getUserAccounts error:", error.message);
      return [];
    }
    return (data ?? []).map((r: { id: string; account_type: string; name: string; sort_order: number }) => ({
      id: r.id,
      accountType: r.account_type,
      name: r.name,
      sortOrder: r.sort_order,
    }));
  },

  createUserAccount: async (accountType: string, name: string): Promise<string> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { data, error } = await supabase
      .from("user_accounts")
      .insert({ user_id: userId, account_type: accountType, name })
      .select("id")
      .single();
    if (error) {
      console.error("[storage] createUserAccount error:", error.message);
      throw new Error(error.message);
    }
    return data.id as string;
  },

  deleteUserAccount: async (accountId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase
      .from("user_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", userId);
    if (error) {
      console.error("[storage] deleteUserAccount error:", error.message);
      throw new Error(error.message);
    }
  },

  // Income Allocations (income → specific account)
  getIncomeAllocations: async (): Promise<{ incomeId: string; accountId: string }[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("income_allocations")
      .select("income_id, account_id")
      .eq("user_id", userId);
    if (error) {
      console.error("[storage] getIncomeAllocations error:", error.message);
      return [];
    }
    return (data ?? []).map((r: { income_id: string; account_id: string }) => ({
      incomeId: r.income_id,
      accountId: r.account_id,
    }));
  },

  saveIncomeAllocation: async (incomeId: string, accountId: string, amount: number): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase.from("income_allocations").upsert(
      { user_id: userId, income_id: incomeId, account_id: accountId, amount },
      { onConflict: "user_id,income_id" }
    );
    if (error) {
      console.error("[storage] saveIncomeAllocation error:", error.message);
      throw new Error(error.message);
    }
  },

  // Account → Expense allocations (how much from an account goes to a planned expense)
  getAccountExpenseAllocations: async (): Promise<{ id: string; accountId: string; expenseId: string; amount: number }[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("account_expense_allocations")
      .select("id, account_id, expense_id, amount")
      .eq("user_id", userId);
    if (error) {
      console.error("[storage] getAccountExpenseAllocations error:", error.message);
      return [];
    }
    return (data ?? []).map((r: { id: string; account_id: string; expense_id: string; amount: number }) => ({
      id: r.id,
      accountId: r.account_id,
      expenseId: r.expense_id,
      amount: Number(r.amount),
    }));
  },

  saveAccountExpenseAllocation: async (accountId: string, expenseId: string, amount: number): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase.from("account_expense_allocations").upsert(
      { user_id: userId, account_id: accountId, expense_id: expenseId, amount },
      { onConflict: "user_id,account_id,expense_id" }
    );
    if (error) {
      console.error("[storage] saveAccountExpenseAllocation error:", error.message);
      throw new Error(error.message);
    }
  },

  deleteAccountExpenseAllocation: async (accountId: string, expenseId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase
      .from("account_expense_allocations")
      .delete()
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .eq("expense_id", expenseId);
    if (error) {
      console.error("[storage] deleteAccountExpenseAllocation error:", error.message);
      throw new Error(error.message);
    }
  },

  removeIncomeAllocation: async (incomeId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase
      .from("income_allocations")
      .delete()
      .eq("user_id", userId)
      .eq("income_id", incomeId);
    if (error) {
      console.error("[storage] removeIncomeAllocation error:", error.message);
      throw new Error(error.message);
    }
  },

  // Budget flow helper state (server persistence for amount-based drag flows)
  getBudgetFlowState: async (): Promise<{
    incomeTransferAmounts: { incomeId: string; amount: number }[];
    accountTransfers: { fromAccountId: string; toAccountId: string; amount: number }[];
  }> => {
    const userId = await getCurrentUserId();
    if (!userId) return { incomeTransferAmounts: [], accountTransfers: [] };

    const [incomeTransferRows, accountTransferRows] = await Promise.all([
      supabase
        .from("income_allocations")
        .select("income_id, amount")
        .eq("user_id", userId)
        .gt("amount", 0),
      supabase
        .from("account_transfers")
        .select("from_account_id, to_account_id, amount")
        .eq("user_id", userId),
    ]);

    if (incomeTransferRows.error) {
      console.error("[storage] getBudgetFlowState income transfers error:", incomeTransferRows.error.message);
    }
    if (accountTransferRows.error) {
      console.error("[storage] getBudgetFlowState account transfers error:", accountTransferRows.error.message);
    }

    return {
      incomeTransferAmounts: (incomeTransferRows.data ?? []).map((r: { income_id: string; amount: number }) => ({
        incomeId: r.income_id,
        amount: Number(r.amount) || 0,
      })),
      accountTransfers: (accountTransferRows.data ?? []).map((r: { from_account_id: string; to_account_id: string; amount: number }) => ({
        fromAccountId: r.from_account_id,
        toAccountId: r.to_account_id,
        amount: Number(r.amount) || 0,
      })),
    };
  },

  saveIncomeTransferAmount: async (incomeId: string, amount: number): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase
      .from("income_allocations")
      .update({ amount })
      .eq("user_id", userId)
      .eq("income_id", incomeId);
    if (error) {
      console.error("[storage] saveIncomeTransferAmount error:", error.message);
      throw new Error(error.message);
    }
  },

  removeIncomeTransferAmount: async (incomeId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase
      .from("income_allocations")
      .update({ amount: 0 })
      .eq("user_id", userId)
      .eq("income_id", incomeId);
    if (error) {
      console.error("[storage] removeIncomeTransferAmount error:", error.message);
      throw new Error(error.message);
    }
  },

  saveAccountTransferAmount: async (fromAccountId: string, toAccountId: string, amount: number): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase.from("account_transfers").upsert(
      {
        user_id: userId,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
      },
      { onConflict: "user_id,from_account_id,to_account_id" }
    );
    if (error) {
      console.error("[storage] saveAccountTransferAmount error:", error.message);
      throw new Error(error.message);
    }
  },

  removeAccountTransferAmount: async (fromAccountId: string, toAccountId: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("You must be signed in.");
    const { error } = await supabase
      .from("account_transfers")
      .delete()
      .eq("user_id", userId)
      .eq("from_account_id", fromAccountId)
      .eq("to_account_id", toAccountId);
    if (error) {
      console.error("[storage] removeAccountTransferAmount error:", error.message);
      throw new Error(error.message);
    }
  },

  // Legacy onboarding data store (JSONB). Read-only fallback for older users.
  getOnboardingData: async (): Promise<{
    income: any[];
    expenses: any[];
    assets: any[];
    liabilities: any[];
  }> => {
    const userId = await getCurrentUserId();
    if (!userId) return { income: [], expenses: [], assets: [], liabilities: [] };
    const { data, error } = await supabase
      .from("onboarding_data")
      .select("income, expenses, assets, liabilities")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data)
      return { income: [], expenses: [], assets: [], liabilities: [] };
    return {
      income: (data.income as any[]) ?? [],
      expenses: (data.expenses as any[]) ?? [],
      assets: (data.assets as any[]) ?? [],
      liabilities: (data.liabilities as any[]) ?? [],
    };
  },

  /**
   * Record that the user visited/updated their budget today.
   * Upserts into `budget_activities (user_id, date)` — one row per day.
   */
  logBudgetActivity: async (): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("budget_activities")
      .upsert({ user_id: userId, date: today }, { onConflict: "user_id,date" });
    if (error) console.error("[logBudgetActivity]", error.message);
  },

  /**
   * Record that the user completed an earn task today.
   * Upserts into `earn_activities (user_id, date)` — one row per day.
   */
  logEarnActivity: async (): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("earn_activities")
      .upsert({ user_id: userId, date: today }, { onConflict: "user_id,date" });
    if (error) console.error("[logEarnActivity]", error.message);
  },

  /**
   * Load the Budget page in one auth pass.
   * Keeps the read set narrower than getDashboardData: only current-month expenses
   * and one combined income allocation query.
   */
  getBudgetManagerData: async (options?: { bypassCache?: boolean; writeCache?: boolean }): Promise<BudgetManagerData | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    if (!options?.bypassCache) {
      const cachedData = readBudgetManagerCache(userId);
      if (cachedData) return cachedData;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const nextMonthStart = `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, "0")}-01`;
    const today = `${year}-${String(month + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [
      profileRow,
      expensesData,
      incomeData,
      budgetExpensesData,
      userAccountsData,
      incomeAllocationsData,
      accountExpenseAllocationsData,
      accountTransfersData,
      rewardTransactionsData,
      budgetActivityWrite,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .gte("date", monthStart)
        .lt("date", nextMonthStart)
        .order("date", { ascending: false }),
      supabase.from("income").select("*").eq("user_id", userId),
      supabase.from("budget_expenses").select("*").eq("user_id", userId),
      supabase.from("user_accounts").select("id, account_type, name, sort_order").eq("user_id", userId).order("sort_order").order("created_at"),
      supabase.from("income_allocations").select("income_id, account_id, amount").eq("user_id", userId),
      supabase.from("account_expense_allocations").select("account_id, expense_id, amount").eq("user_id", userId),
      supabase.from("account_transfers").select("from_account_id, to_account_id, amount").eq("user_id", userId),
      supabase.from("reward_transactions").select("points_delta").eq("user_id", userId).gt("points_delta", 0),
      supabase.from("budget_activities").upsert({ user_id: userId, date: today }, { onConflict: "user_id,date" }),
    ]);

    if (budgetActivityWrite.error) console.error("[logBudgetActivity]", budgetActivityWrite.error.message);
    if (expensesData.error) console.error("[storage] getBudgetManagerData expenses error:", expensesData.error.message);
    if (incomeData.error) console.error("[storage] getBudgetManagerData income error:", incomeData.error.message);
    if (budgetExpensesData.error) console.error("[storage] getBudgetManagerData budget expenses error:", budgetExpensesData.error.message);
    if (userAccountsData.error) console.error("[storage] getBudgetManagerData accounts error:", userAccountsData.error.message);
    if (incomeAllocationsData.error) console.error("[storage] getBudgetManagerData income allocations error:", incomeAllocationsData.error.message);
    if (accountExpenseAllocationsData.error) console.error("[storage] getBudgetManagerData expense allocations error:", accountExpenseAllocationsData.error.message);
    if (accountTransfersData.error) console.error("[storage] getBudgetManagerData account transfers error:", accountTransfersData.error.message);
    if (rewardTransactionsData.error) console.error("[storage] getBudgetManagerData wallet balance error:", rewardTransactionsData.error.message);

    const profile =
      profileRow.data && !profileRow.error
        ? mapRowToProfile(profileRow.data as Record<string, unknown>)
        : null;
    const totalRewardPoints = (rewardTransactionsData.data ?? []).reduce(
      (sum: number, row: { points_delta: number }) => sum + Number(row.points_delta),
      0
    );

    const expenses = (expensesData.data ?? []).map((r) => mapRowToExpense(r as Record<string, unknown>));
    const income = (incomeData.data ?? []).map((r) => mapRowToIncome(r as Record<string, unknown>));
    const userAccounts = (userAccountsData.data ?? []).map((r: { id: string; account_type: string; name: string; sort_order: number }) => ({
      id: r.id,
      accountType: r.account_type,
      name: r.name,
      sortOrder: r.sort_order,
    }));
    const incomeAllocations = (incomeAllocationsData.data ?? []).map((r: { income_id: string; account_id: string; amount: number }) => ({
      incomeId: r.income_id,
      accountId: r.account_id,
      amount: Number(r.amount) || 0,
    }));
    const accountExpenseAllocations = (accountExpenseAllocationsData.data ?? []).map((r: { account_id: string; expense_id: string; amount: number }) => ({
      accountId: r.account_id,
      expenseId: r.expense_id,
      amount: Number(r.amount),
    }));
    const accountTransfers = (accountTransfersData.data ?? []).map((r: { from_account_id: string; to_account_id: string; amount: number }) => ({
      fromAccountId: r.from_account_id,
      toAccountId: r.to_account_id,
      amount: Number(r.amount) || 0,
    }));
    const availableWalletBalance = totalRewardPoints / 100;

    const budgetData: BudgetManagerData = {
      profile,
      expenses,
      income,
      budgetExpenses: (budgetExpensesData.data ?? []).map((r) => mapRowToRegistrationExpense(r as Record<string, unknown>)),
      userAccounts,
      incomeAllocations,
      accountExpenseAllocations,
      accountTransfers,
      availableWalletBalance,
      accountTypeBalances: computeAccountTypeBalances({
        userAccounts,
        income,
        incomeAllocations,
        accountExpenseAllocations,
        accountTransfers,
        expenses,
        walletBalance: availableWalletBalance,
      }),
    };

    const shouldWriteCache = options?.writeCache ?? !options?.bypassCache;
    if (shouldWriteCache) {
      writeBudgetManagerCache(userId, budgetData);
    }
    return budgetData;
  },

  /** Refresh session cache after a successful background revalidation load. */
  persistBudgetManagerCache: async (data: Omit<BudgetManagerData, "fromCache">): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    writeBudgetManagerCache(userId, data);
  },

  clearBudgetManagerCache,

  /**
   * Load all dashboard data in one go: one auth check + 8 parallel table reads.
   * Use this instead of calling getProfile, getExpenses, getDebts, etc. separately for faster load.
   */
  getDashboardData: async (): Promise<{
    profile: UserProfile | null;
    expenses: Expense[];
    debts: Debt[];
    assets: Asset[];
    income: Income[];
    budgetExpenses: RegistrationExpense[];
    liabilities: Liability[];
    dailyMoods: DailyMood[];
    earnDates: string[];
    budgetActivityDates: string[];
    onboarding: { income: any[]; expenses: any[]; assets: any[]; liabilities: any[] };
    userAccounts: { id: string; accountType: string; name: string }[];
    incomeAllocations: { incomeId: string; accountId: string; amount: number }[];
    accountExpenseAllocations: { accountId: string; expenseId: string; amount: number }[];
    accountTransfers: { fromAccountId: string; toAccountId: string; amount: number }[];
    accountTypeBalances: { type: string; total: number }[];
  } | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const [
      profileRow,
      expensesData,
      debtsData,
      assetsData,
      incomeData,
      budgetExpensesData,
      liabilitiesData,
      dailyMoodsData,
      earnActivitiesData,
      budgetActivitiesData,
      onboardingData,
      userAccountsData,
      incomeAllocationsData,
      accountExpenseAllocationsData,
      accountTransfersData,
      rewardTransactionsData,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("expenses").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("debts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("assets").select("*").eq("user_id", userId),
      supabase.from("income").select("*").eq("user_id", userId),
      supabase.from("budget_expenses").select("*").eq("user_id", userId),
      supabase.from("liabilities").select("*").eq("user_id", userId),
      supabase.from("daily_moods").select("date, mood").eq("user_id", userId),
      supabase.from("earn_activities").select("date").eq("user_id", userId).then((r) => r.error ? { data: [] } : r),
      supabase.from("budget_activities").select("date").eq("user_id", userId).then((r) => r.error ? { data: [] } : r),
      supabase.from("onboarding_data").select("income, expenses, assets, liabilities").eq("user_id", userId).maybeSingle(),
      supabase.from("user_accounts").select("id, account_type, name").eq("user_id", userId),
      supabase.from("income_allocations").select("income_id, account_id, amount").eq("user_id", userId),
      supabase.from("account_expense_allocations").select("account_id, expense_id, amount").eq("user_id", userId),
      supabase.from("account_transfers").select("from_account_id, to_account_id, amount").eq("user_id", userId),
      supabase.from("reward_transactions").select("points_delta").eq("user_id", userId).gt("points_delta", 0),
    ]);

    const profile =
      profileRow.data && !profileRow.error
        ? mapRowToProfile(profileRow.data as Record<string, unknown>)
        : null;
    const expenses = (expensesData.data ?? []).map((r) => mapRowToExpense(r as Record<string, unknown>));
    const income = (incomeData.data ?? []).map((r) => mapRowToIncome(r as Record<string, unknown>));
    const userAccounts = (userAccountsData.data ?? []).map((r: { id: string; account_type: string; name: string }) => ({
      id: r.id,
      accountType: r.account_type,
      name: r.name,
    }));
    const incomeAllocations = (incomeAllocationsData.data ?? []).map((r: { income_id: string; account_id: string; amount: number }) => ({
      incomeId: r.income_id,
      accountId: r.account_id,
      amount: Number(r.amount) || 0,
    }));
    const accountExpenseAllocations = (accountExpenseAllocationsData.data ?? []).map((r: { account_id: string; expense_id: string; amount: number }) => ({
      accountId: r.account_id,
      expenseId: r.expense_id,
      amount: Number(r.amount),
    }));
    const accountTransfers = (accountTransfersData.data ?? []).map((r: { from_account_id: string; to_account_id: string; amount: number }) => ({
      fromAccountId: r.from_account_id,
      toAccountId: r.to_account_id,
      amount: Number(r.amount) || 0,
    }));
    const walletBalance =
      (rewardTransactionsData.data ?? []).reduce(
        (sum: number, row: { points_delta: number }) => sum + Number(row.points_delta),
        0
      ) / 100;

    return {
      profile,
      expenses,
      debts: (debtsData.data ?? []).map((r) => mapRowToDebt(r as Record<string, unknown>)),
      assets: (assetsData.data ?? []).map((r) => mapRowToAsset(r as Record<string, unknown>)),
      income,
      budgetExpenses: (budgetExpensesData.data ?? []).map((r) => mapRowToRegistrationExpense(r as Record<string, unknown>)),
      liabilities: (liabilitiesData.data ?? []).map((r) => mapRowToLiability(r as Record<string, unknown>)),
      dailyMoods: (dailyMoodsData.data ?? []).map((r: { date: string; mood: string }) => ({
        date: normalizePgDateKey(r.date),
        mood: r.mood as DailyMood["mood"],
      })),
      earnDates: (earnActivitiesData.data ?? []).map((r: { date: string }) => normalizePgDateKey(r.date)),
      budgetActivityDates: (budgetActivitiesData.data ?? []).map((r: { date: string }) => normalizePgDateKey(r.date)),
      onboarding:
        onboardingData.data && !onboardingData.error
          ? {
            income: ((onboardingData.data as any).income as any[]) ?? [],
            expenses: ((onboardingData.data as any).expenses as any[]) ?? [],
            assets: ((onboardingData.data as any).assets as any[]) ?? [],
            liabilities: ((onboardingData.data as any).liabilities as any[]) ?? [],
          }
          : { income: [], expenses: [], assets: [], liabilities: [] },
      userAccounts,
      incomeAllocations,
      accountExpenseAllocations,
      accountTransfers,
      accountTypeBalances: computeAccountTypeBalances({
        userAccounts,
        income,
        incomeAllocations,
        accountExpenseAllocations,
        accountTransfers,
        expenses,
        walletBalance,
      }),
    };
  },
};

// Row mappers (Supabase snake_case -> app camelCase)
function mapRowToProfile(r: Record<string, unknown>): UserProfile {
  const name = (r.name as string) ?? "";
  const fallbackNameParts = splitNameParts(name);
  const firstName = ((r.first_name as string) ?? "").trim() || fallbackNameParts.firstName;
  const lastName = ((r.last_name as string) ?? "").trim() || fallbackNameParts.lastName;
  const fullName = name || `${firstName} ${lastName}`.trim();
  return {
    id: r.id as string,
    name: fullName,
    firstName,
    lastName,
    email: (r.email as string) ?? "",
    phone: r.phone as string | undefined,
    monthlyIncome: Number(r.monthly_income) ?? 0,
    savingsGoal: r.savings_goal != null ? Number(r.savings_goal) : undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    mood: r.mood as UserProfile["mood"],
    capital: r.capital != null ? Number(r.capital) : undefined,
    debts: r.debts != null ? Number(r.debts) : undefined,
    lastIncome: r.last_income != null ? Number(r.last_income) : undefined,
    lastExpenses: r.last_expenses != null ? Number(r.last_expenses) : undefined,
    incomeGoals: r.income_goals != null ? Number(r.income_goals) : undefined,
    savingGoals: r.saving_goals != null ? Number(r.saving_goals) : undefined,
    onboardingCompleted: Boolean(r.onboarding_completed),
    onboardingSkipped: Boolean(r.onboarding_skipped),
    userPoints: r.user_points != null ? Number(r.user_points) : undefined,
    membership: (r.membership as UserProfile["membership"]) ?? "Debt Crusher",
    onboardingStep: r.onboarding_step != null ? Number(r.onboarding_step) : undefined,
    onboardingMood: (r.onboarding_mood as UserProfile["onboardingMood"]) ?? undefined,
    role: (r.role as UserProfile["role"]) ?? "user",
    debtStatus: (r.debt_status as UserProfile["debtStatus"]) ?? undefined,
    savingsStatus: (r.savings_status as UserProfile["savingsStatus"]) ?? undefined,
    investmentStatus: (r.investment_status as UserProfile["investmentStatus"]) ?? undefined,
    incomeStability: (r.income_stability as UserProfile["incomeStability"]) ?? undefined,
    emergencyResilience: (r.emergency_resilience as UserProfile["emergencyResilience"]) ?? undefined,
    primaryGoal: (r.primary_goal as UserProfile["primaryGoal"]) ?? undefined,
    initials: (r.initials as string) ?? undefined,
    workNumber: (r.work_number as string) ?? undefined,
    homeNumber: (r.home_number as string) ?? undefined,
    workEmail: (r.work_email as string) ?? undefined,
    dateOfBirth: (r.date_of_birth as string) ?? undefined,
    dateOfMarriage: (r.date_of_marriage as string) ?? undefined,
    idNumber: (r.id_number as string) ?? undefined,
    taxNumber: (r.tax_number as string) ?? undefined,
    occupation: (r.occupation as string) ?? undefined,
    employer: (r.employer as string) ?? undefined,
    highestQualification: (r.highest_qualification as string) ?? undefined,
    gender: (r.gender as UserProfile["gender"]) ?? undefined,
    maritalStatus: (r.marital_status as UserProfile["maritalStatus"]) ?? "unknown",
    sourceOfWealth: (r.source_of_wealth as UserProfile["sourceOfWealth"]) ?? undefined,
    industryClassification: (r.industry_classification as UserProfile["industryClassification"]) ?? undefined,
    bankAccountHolder: (r.bank_account_holder as string) ?? undefined,
    bankCode: r.bank_code != null ? Number(r.bank_code) : undefined,
    bankName: (r.bank_name as string) ?? undefined,
    bankBranchCode: (r.bank_branch_code as string) ?? undefined,
    bankAccountType: (r.bank_account_type as string) ?? undefined,
    bankAccountNumber: (r.bank_account_number as string) ?? undefined,
    crmProfileData: readCrmProfileData(r.crm_profile_data),
  };
}

function mapRowToExpense(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    title: r.title as string,
    amount: Number(r.amount),
    category: r.category as Expense["category"],
    date: r.date as string,
    description: r.description as string | undefined,
    accountId: r.account_id as string | undefined,
  };
}

function mapRowToDebt(r: Record<string, unknown>): Debt {
  return {
    id: r.id as string,
    name: r.name as string,
    totalAmount: Number(r.total_amount),
    remainingAmount: Number(r.remaining_amount),
    interestRate: Number(r.interest_rate),
    minimumPayment: Number(r.minimum_payment),
    dueDate: r.due_date as string,
    type: r.type as Debt["type"],
    createdAt: r.created_at as string,
  };
}

function mapRowToAsset(r: Record<string, unknown>): Asset {
  return {
    id: r.id as string,
    category: r.category as Asset["category"],
    type: r.type as Asset["type"],
    name: r.name as string,
    personal: Number(r.personal),
    spouse: Number(r.spouse),
    points: Number(r.points),
    interestRate: Number(r.interest_rate),
    editable: r.editable as boolean | undefined,
  };
}

function mapRowToLiability(r: Record<string, unknown>): Liability {
  return {
    id: r.id as string,
    category: r.category as Liability["category"],
    type: r.type as Liability["type"],
    name: r.name as string,
    personal: Number(r.personal),
    spouse: Number(r.spouse),
    points: Number(r.points),
    interestRate: Number(r.interest_rate),
    editable: r.editable as boolean | undefined,
  };
}

function mapRowToIncome(r: Record<string, unknown>): Income {
  return {
    id: r.id as string,
    category: r.category as Income["category"],
    type: r.type as Income["type"],
    name: (r.name as string) ?? "",
    personal: Number(r.personal),
    spouse: Number(r.spouse),
    points: Number(r.points),
    editable: r.editable as boolean | undefined,
  };
}

function mapRowToRegistrationExpense(r: Record<string, unknown>): RegistrationExpense {
  return {
    id: r.id as string,
    category: r.category as RegistrationExpense["category"],
    type: r.type as RegistrationExpense["type"],
    name: (r.name as string) ?? "",
    personal: Number(r.personal),
    spouse: Number(r.spouse),
    points: Number(r.points),
    editable: r.editable as boolean | undefined,
  };
}
