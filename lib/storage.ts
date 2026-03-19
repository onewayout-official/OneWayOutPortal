import { UserProfile, Expense, Debt, AuthSession, Asset, DailyMood, Income, RegistrationExpense, Liability, SpendCategory } from "@/types";
import { supabase } from "@/lib/supabase";

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
      await supabase.from("profiles").upsert({
        id: userId,
        name: (authUser.user_metadata?.name as string) || "",
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
        user_points: 0,
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
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? null,
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
      user_points: profile.userPoints ?? 0,
    });
    if (error) console.error("[storage] saveProfile error:", error.message);
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
    });
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
    if (upsertError) console.error("[storage] saveBudgetExpenses upsert error:", upsertError.message);
  },

  /** Spend screen: budget amount per category (from budget_expenses where category is one of the 7). */
  getSpendBudgets: async (): Promise<Record<SpendCategory, number>> => {
    const all = await storage.getBudgetExpenses();
    const budgets = { Grocery: 0, Fuel: 0, Electricity: 0, Airtime: 0, Water: 0, Rent: 0, Transport: 0 } as Record<SpendCategory, number>;
    const spendCategories: SpendCategory[] = ["Grocery", "Fuel", "Electricity", "Airtime", "Water", "Rent", "Transport"];
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
    const spendCategories: SpendCategory[] = ["Grocery", "Fuel", "Electricity", "Airtime", "Water", "Rent", "Transport"];
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
    if (error) return [];
    return (data ?? []).map((r: { date: string; mood: string }) => ({ date: r.date, mood: r.mood as DailyMood["mood"] }));
  },

  saveDailyMood: async (mood: DailyMood): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    // Must specify onConflict for composite PK (user_id, date) (fix #8)
    const { error } = await supabase.from("daily_moods").upsert(
      { user_id: userId, date: mood.date, mood: mood.mood },
      { onConflict: "user_id,date" }
    );
    if (error) console.error("[storage] saveDailyMood error:", error.message);
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
    onboarding: { income: any[]; expenses: any[]; assets: any[]; liabilities: any[] };
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
      onboardingData,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("expenses").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("debts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("assets").select("*").eq("user_id", userId),
      supabase.from("income").select("*").eq("user_id", userId),
      supabase.from("budget_expenses").select("*").eq("user_id", userId),
      supabase.from("liabilities").select("*").eq("user_id", userId),
      supabase.from("onboarding_data").select("income, expenses, assets, liabilities").eq("user_id", userId).maybeSingle(),
    ]);

    const profile =
      profileRow.data && !profileRow.error
        ? mapRowToProfile(profileRow.data as Record<string, unknown>)
        : null;

    return {
      profile,
      expenses: (expensesData.data ?? []).map((r) => mapRowToExpense(r as Record<string, unknown>)),
      debts: (debtsData.data ?? []).map((r) => mapRowToDebt(r as Record<string, unknown>)),
      assets: (assetsData.data ?? []).map((r) => mapRowToAsset(r as Record<string, unknown>)),
      income: (incomeData.data ?? []).map((r) => mapRowToIncome(r as Record<string, unknown>)),
      budgetExpenses: (budgetExpensesData.data ?? []).map((r) => mapRowToRegistrationExpense(r as Record<string, unknown>)),
      liabilities: (liabilitiesData.data ?? []).map((r) => mapRowToLiability(r as Record<string, unknown>)),
      onboarding:
        onboardingData.data && !onboardingData.error
          ? {
            income: ((onboardingData.data as any).income as any[]) ?? [],
            expenses: ((onboardingData.data as any).expenses as any[]) ?? [],
            assets: ((onboardingData.data as any).assets as any[]) ?? [],
            liabilities: ((onboardingData.data as any).liabilities as any[]) ?? [],
          }
          : { income: [], expenses: [], assets: [], liabilities: [] },
    };
  },
};

// Row mappers (Supabase snake_case -> app camelCase)
function mapRowToProfile(r: Record<string, unknown>): UserProfile {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
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
    userPoints: r.user_points != null ? Number(r.user_points) : undefined,
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
