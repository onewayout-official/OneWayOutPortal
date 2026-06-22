"use client";

import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import { rewards, tryAwardTask } from "@/lib/gamification/rewards";
import {
  Income, IncomeCategory,
  RegistrationExpense, ExpenseCategory,
  Asset, AssetCategory,
  Liability, LiabilityCategory,
} from "@/types";
import { DollarSign, Plus, Loader2, Check, TrendingUp, TrendingDown, Wallet, BarChart3, FileText } from "lucide-react";

// ─── Local form-entry shapes ───────────────────────────────────────────────

interface IncomeEntry {
  id: string;
  incomeType: string;
  source: string;
  name: string;
  personal: number;
  total: number;
  points: number;
  namePlaceholder: string;
}

interface ExpenseEntry {
  id: string;
  expenseCategory: string;
  expenseType: string;
  name: string;
  personal: number;
  total: number;
  points: number;
  namePlaceholder: string;
}

interface AssetEntry {
  id: string;
  expenses: string;
  expenseType: string;
  name: string;
  personal: number;
  total: number;
  points: number;
  interestRate: number;
  namePlaceholder: string;
}

// ─── Default row templates (pre-populated, all zeros) ────────────────────

const DEFAULT_INCOME: Omit<IncomeEntry, "id">[] = [
  { incomeType: "Salary",               source: "Fixed",    name: "", personal: 0, total: 0, points: 500, namePlaceholder: "Employer Name" },
  { incomeType: "Rental Income",        source: "Fixed",    name: "", personal: 0, total: 0, points: 200, namePlaceholder: "Leasee Name" },
  { incomeType: "Bonus",                source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Employer Name" },
  { incomeType: "Side Hustle",          source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Name" },
  { incomeType: "Board Fees",           source: "Fixed",    name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Employer Name" },
  { incomeType: "Commission",           source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Employer Name" },
  { incomeType: "Business Income",      source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Employer Name" },
  { incomeType: "Pension",              source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Pension Fund Name" },
  { incomeType: "Retirement Annuities", source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Retirement Fund Name" },
  { incomeType: "Dividends",            source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Investment Name" },
  { incomeType: "Interest Income",      source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Investment Name" },
  { incomeType: "Sales of Goods",       source: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Good Name" },
];

const DEFAULT_EXPENSES: Omit<ExpenseEntry, "id">[] = [
  { expenseCategory: "Company Pension",          expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 500, namePlaceholder: "Pension Fund Name" },
  { expenseCategory: "Tax",                       expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 200, namePlaceholder: "NAMRA" },
  { expenseCategory: "Medical Aid",               expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 200, namePlaceholder: "Medical Aid Name" },
  { expenseCategory: "Investments",               expenseType: "Variable", name: "", personal: 0, total: 0, points: 105, namePlaceholder: "Investment Name" },
  { expenseCategory: "Retirement Annuity",        expenseType: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Fund Name" },
  { expenseCategory: "Long Term Insurance",       expenseType: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Insurer Name" },
  { expenseCategory: "Short Term Insurance",      expenseType: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Insurer Name" },
  { expenseCategory: "Funeral Insurance",         expenseType: "Variable", name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Insurer Name" },
  { expenseCategory: "Bank Charges",              expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Bank Name" },
  { expenseCategory: "Personal Loan Payments",    expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Bank Name" },
  { expenseCategory: "Home Loan Payments",        expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Bank Name" },
  { expenseCategory: "Vehicle Loan Payments",     expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Bank Name" },
  { expenseCategory: "Credit Card Payments",      expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Bank Name" },
  { expenseCategory: "Rental Expenses",           expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Property Name" },
  { expenseCategory: "Water & Electricity",       expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Property Name" },
  { expenseCategory: "Rates and Taxes",           expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Property Name" },
  { expenseCategory: "Groceries",                 expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Various" },
  { expenseCategory: "Dining Out",                expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Lunch",                     expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Subscriptions",             expenseType: "Variable", name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Various" },
  { expenseCategory: "Clothing Accounts",         expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Various" },
  { expenseCategory: "Fuel & Transport Expenses", expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 50,  namePlaceholder: "Various" },
  { expenseCategory: "Entertainment",             expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Domestic Staff Salary",     expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Staff Name" },
  { expenseCategory: "Garden Staff Salary",       expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Staff Name" },
  { expenseCategory: "Kids: School Fees",         expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Kid Names" },
  { expenseCategory: "Kids: After Care",          expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Kid Names" },
  { expenseCategory: "Kids: Extra Mural Activities", expenseType: "Fixed", name: "", personal: 0, total: 0, points: 25, namePlaceholder: "Kid Names" },
  { expenseCategory: "Kids: Maintenance",         expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Kid Names" },
  { expenseCategory: "Maintenance: Car",          expenseType: "Variable", name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Various" },
  { expenseCategory: "Maintenance: House",        expenseType: "Variable", name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Various" },
  { expenseCategory: "Armed Response",            expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Company Name" },
  { expenseCategory: "Internet/Data",             expenseType: "Fixed",    name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Company Name" },
  { expenseCategory: "Airtime",                   expenseType: "Variable", name: "", personal: 0, total: 0, points: 25,  namePlaceholder: "Company Name" },
  { expenseCategory: "Family: Extended",          expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Farm Expenses",             expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Donations",                 expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Legal Expense",             expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Educations",                expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Medicine",                  expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Administration",            expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Various" },
  { expenseCategory: "Vacations",                 expenseType: "Variable", name: "", personal: 0, total: 0, points: 10,  namePlaceholder: "Destination" },
];

const DEFAULT_ASSETS: Omit<AssetEntry, "id">[] = [
  { expenses: "House",                    expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Property Name" },
  { expenses: "Farm",                     expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Property Name" },
  { expenses: "Vehicles",                 expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Vehicle Name" },
  { expenses: "Investment Fund",          expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Investment Name" },
  { expenses: "Pension Fund",             expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Pension Fund Name" },
  { expenses: "Retirement Annuity",       expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Retirement Fund Name" },
  { expenses: "Employee Shares",          expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Company Name" },
  { expenses: "Shares",                   expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Share Name" },
  { expenses: "Long Term loans to Others",expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Name" },
  { expenses: "Household Furniture",      expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Jewelry",                  expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Clothing & Attire",        expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Machinery",               expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Insurance Policies",       expenseType: "Fixed Assets",   name: "", personal: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Insurer Name" },
  { expenses: "Inventory",               expenseType: "Current Assets", name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Cash Balance",             expenseType: "Current Assets", name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Short term loans to Other",expenseType: "Current Assets", name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Prepayments",             expenseType: "Current Assets", name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Deposits",                expenseType: "Current Assets", name: "", personal: 0, total: 0, points: 25,  interestRate: 0, namePlaceholder: "Various" },
];

const DEFAULT_LIABILITIES: Omit<AssetEntry, "id">[] = [
  { expenses: "House",                        expenseType: "Long Term Liabilities", name: "", personal: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Property Name" },
  { expenses: "Farm",                         expenseType: "Long Term Liabilities", name: "", personal: 0, total: 0, points: 75,  interestRate: 0, namePlaceholder: "Property Name" },
  { expenses: "Vehicles",                     expenseType: "Long Term Liabilities", name: "", personal: 0, total: 0, points: 75,  interestRate: 0, namePlaceholder: "Vehicle Name" },
  { expenses: "Long Term loans from Others",  expenseType: "Long Term Liabilities", name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Name" },
  { expenses: "Household Furniture",          expenseType: "Long Term Liabilities", name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Jewelry",                      expenseType: "Short Term Liabilities",name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Clothing & Attire",            expenseType: "Short Term Liabilities",name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Various" },
  { expenses: "Credit Card",                  expenseType: "Short Term Liabilities",name: "", personal: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Bank Name" },
  { expenses: "Overdraft",                    expenseType: "Short Term Liabilities",name: "", personal: 0, total: 0, points: 100, interestRate: 0, namePlaceholder: "Bank Name" },
  { expenses: "Short term loans to Other",    expenseType: "Short Term Liabilities",name: "", personal: 0, total: 0, points: 50,  interestRate: 0, namePlaceholder: "Various" },
];

// ─── Helper: merge stored records into default entry rows ─────────────────

function mergeIncomeWithDefaults(stored: Income[]): IncomeEntry[] {
  const defaults: IncomeEntry[] = DEFAULT_INCOME.map((d) => ({ ...d, id: crypto.randomUUID() }));
  const extras: IncomeEntry[] = [];
  for (const s of stored) {
    const idx = defaults.findIndex((d) => d.incomeType === s.category);
    if (idx >= 0) {
      defaults[idx] = { ...defaults[idx], id: s.id, name: s.name, personal: s.personal, total: s.personal, points: s.points };
    } else {
      extras.push({ id: s.id, incomeType: s.category, source: s.type, name: s.name, personal: s.personal, total: s.personal, points: s.points, namePlaceholder: s.category });
    }
  }
  return [...defaults, ...extras];
}

function mergeExpensesWithDefaults(stored: RegistrationExpense[]): ExpenseEntry[] {
  const SPEND_CATS = ["Grocery", "Fuel", "Electricity", "Airtime", "Water", "Rent", "Transport", "Send to others"];
  const filtered = stored.filter((s) => !SPEND_CATS.includes(s.category));
  const defaults: ExpenseEntry[] = DEFAULT_EXPENSES.map((d) => ({ ...d, id: crypto.randomUUID() }));
  const extras: ExpenseEntry[] = [];
  for (const s of filtered) {
    const idx = defaults.findIndex((d) => d.expenseCategory === s.category);
    if (idx >= 0) {
      defaults[idx] = { ...defaults[idx], id: s.id, name: s.name, personal: s.personal, total: s.personal, points: s.points };
    } else {
      extras.push({ id: s.id, expenseCategory: s.category, expenseType: s.type, name: s.name, personal: s.personal, total: s.personal, points: s.points, namePlaceholder: s.category });
    }
  }
  return [...defaults, ...extras];
}

function mergeAssetsWithDefaults(stored: Asset[]): AssetEntry[] {
  const defaults: AssetEntry[] = DEFAULT_ASSETS.map((d) => ({ ...d, id: crypto.randomUUID() }));
  const extras: AssetEntry[] = [];
  for (const s of stored) {
    const idx = defaults.findIndex((d) => d.expenses === s.category && d.expenseType === s.type);
    if (idx >= 0) {
      defaults[idx] = { ...defaults[idx], id: s.id, name: s.name, personal: s.personal, total: s.personal, points: s.points, interestRate: s.interestRate };
    } else {
      extras.push({ id: s.id, expenses: s.category, expenseType: s.type, name: s.name, personal: s.personal, total: s.personal, points: s.points, interestRate: s.interestRate, namePlaceholder: s.category });
    }
  }
  return [...defaults, ...extras];
}

function mergeLiabilitiesWithDefaults(stored: Liability[]): AssetEntry[] {
  const defaults: AssetEntry[] = DEFAULT_LIABILITIES.map((d) => ({ ...d, id: crypto.randomUUID() }));
  const extras: AssetEntry[] = [];
  for (const s of stored.filter((row) => row.category !== "Equity")) {
    const idx = defaults.findIndex((d) => d.expenses === s.category && d.expenseType === s.type);
    if (idx >= 0) {
      defaults[idx] = { ...defaults[idx], id: s.id, name: s.name, personal: s.personal, total: s.personal, points: s.points, interestRate: s.interestRate };
    } else {
      extras.push({ id: s.id, expenses: s.category, expenseType: s.type, name: s.name, personal: s.personal, total: s.personal, points: s.points, interestRate: s.interestRate, namePlaceholder: s.category });
    }
  }
  return [...defaults, ...extras];
}

// ─── Completion helpers ───────────────────────────────────────────────────

const SPEND_CATS = ["Grocery", "Fuel", "Electricity", "Airtime", "Water", "Rent", "Transport", "Send to others"];
const PLAN_SECTIONS = ["income", "expenses", "assets", "liabilities"] as const;

function isMeaningfulEntry(personal: number, name?: string): boolean {
  return personal > 0 || Boolean(name?.trim());
}

function hasMeaningfulPlanData(
  income: Income[],
  expenses: RegistrationExpense[],
  assets: Asset[],
  liabilities: Liability[]
): boolean {
  const planExpenses = expenses.filter((e) => !SPEND_CATS.includes(e.category));
  const planLiabilities = liabilities.filter((l) => l.category !== "Equity");
  return (
    income.some((i) => isMeaningfulEntry(i.personal, i.name)) &&
    planExpenses.some((e) => isMeaningfulEntry(e.personal, e.name)) &&
    assets.some((a) => isMeaningfulEntry(a.personal, a.name)) &&
    planLiabilities.some((l) => isMeaningfulEntry(l.personal, l.name))
  );
}

function isFinancialPlanComplete(completedKeys: string[]): boolean {
  if (completedKeys.includes("full-plan-complete")) return true;
  return PLAN_SECTIONS.every((s) => completedKeys.includes(`plan-section-${s}`));
}

async function markSectionComplete(section: (typeof PLAN_SECTIONS)[number]): Promise<boolean> {
  await tryAwardTask("plan-section-complete", { metadata: { section } });
  const state = await rewards.getGamificationState();
  if (isFinancialPlanComplete(state.completedTaskKeys)) {
    await tryAwardTask("full-plan-complete");
    return true;
  }
  return false;
}

// ─── Tab IDs ─────────────────────────────────────────────────────────────

type TabId = "income" | "expenses" | "assets" | "liabilities";

const TABS: { id: TabId; label: string; icon: typeof DollarSign }[] = [
  { id: "income",      label: "Income",      icon: TrendingUp },
  { id: "expenses",    label: "Expenses",    icon: TrendingDown },
  { id: "assets",      label: "Assets",      icon: Wallet },
  { id: "liabilities", label: "Liabilities", icon: BarChart3 },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function FinancialInsights() {
  const [started, setStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("income");
  const [loading, setLoading] = useState(true);

  // ── Income state ──────────────────────────────────────────────────────
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>(() =>
    DEFAULT_INCOME.map((d) => ({ ...d, id: crypto.randomUUID() }))
  );
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [newIncome, setNewIncome] = useState({ incomeType: "", source: "", name: "", personal: 0, total: 0, points: 0, namePlaceholder: "" });
  const [incomeSaving, setIncomeSaving] = useState(false);
  const [incomeSaved, setIncomeSaved] = useState(false);

  // ── Expenses state ────────────────────────────────────────────────────
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>(() =>
    DEFAULT_EXPENSES.map((d) => ({ ...d, id: crypto.randomUUID() }))
  );
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ expenseCategory: "", expenseType: "", name: "", personal: 0, total: 0, points: 0, namePlaceholder: "" });
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseSaved, setExpenseSaved] = useState(false);

  // ── Assets state ──────────────────────────────────────────────────────
  const [assetEntries, setAssetEntries] = useState<AssetEntry[]>(() =>
    DEFAULT_ASSETS.map((d) => ({ ...d, id: crypto.randomUUID() }))
  );
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ expenses: "", expenseType: "", name: "", personal: 0, total: 0, points: 0, interestRate: 0, namePlaceholder: "" });
  const [assetSaving, setAssetSaving] = useState(false);
  const [assetSaved, setAssetSaved] = useState(false);

  // ── Liabilities state ─────────────────────────────────────────────────
  const [liabilityEntries, setLiabilityEntries] = useState<AssetEntry[]>(() =>
    DEFAULT_LIABILITIES.map((d) => ({ ...d, id: crypto.randomUUID() }))
  );
  const [isAddLiabilityOpen, setIsAddLiabilityOpen] = useState(false);
  const [newLiability, setNewLiability] = useState({ expenses: "", expenseType: "", name: "", personal: 0, total: 0, points: 0, interestRate: 0, namePlaceholder: "" });
  const [liabilitySaving, setLiabilitySaving] = useState(false);
  const [liabilitySaved, setLiabilitySaved] = useState(false);

  // ── Load from Supabase and detect whether the plan is already complete ─
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [income, budgetExpenses, assets, liabilities, gamState] = await Promise.all([
        storage.getIncome(),
        storage.getBudgetExpenses(),
        storage.getAssets(),
        storage.getLiabilities(),
        rewards.getGamificationState(),
      ]);
      if (cancelled) return;

      if (income.length > 0) setIncomeEntries(mergeIncomeWithDefaults(income));
      if (budgetExpenses.length > 0) setExpenseEntries(mergeExpensesWithDefaults(budgetExpenses));
      if (assets.length > 0) setAssetEntries(mergeAssetsWithDefaults(assets));
      if (liabilities.length > 0) setLiabilityEntries(mergeLiabilitiesWithDefaults(liabilities));

      const completed =
        isFinancialPlanComplete(gamState.completedTaskKeys) ||
        hasMeaningfulPlanData(income, budgetExpenses, assets, liabilities);

      if (completed) {
        setIsCompleted(true);
        setStarted(true);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Income handlers ──────────────────────────────────────────────────

  const updateIncomeEntry = (index: number, field: keyof IncomeEntry, value: string | number) => {
    setIncomeEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "personal") updated[index].total = Number(value) || 0;
      return updated;
    });
  };

  const addNewIncome = () => {
    if (!newIncome.incomeType.trim()) return;
    setIncomeEntries((prev) => [...prev, { ...newIncome, id: crypto.randomUUID() }]);
    setIsAddIncomeOpen(false);
    setNewIncome({ incomeType: "", source: "", name: "", personal: 0, total: 0, points: 0, namePlaceholder: "" });
  };

  const handleSaveIncome = async () => {
    setIncomeSaving(true);
    try {
      const toSave: Income[] = incomeEntries
        .filter((e) => e.personal > 0 || e.name.trim() !== "")
        .map((e) => ({
          id: e.id,
          category: e.incomeType as IncomeCategory,
          type: (e.source === "Fixed" || e.source === "Variable" ? e.source : "Variable") as Income["type"],
          name: e.name.trim() || e.incomeType,
          personal: e.personal,
          spouse: 0,
          points: e.points,
          editable: true,
        }));
      await storage.saveIncome(toSave);
      if (!isCompleted && toSave.length > 0) {
        const planDone = await markSectionComplete("income");
        if (planDone) setIsCompleted(true);
      }
      setIncomeSaved(true);
      setTimeout(() => setIncomeSaved(false), 2500);
    } finally {
      setIncomeSaving(false);
    }
  };

  // ─── Expenses handlers ────────────────────────────────────────────────

  const updateExpenseEntry = (index: number, field: keyof ExpenseEntry, value: string | number) => {
    setExpenseEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "personal") updated[index].total = Number(value) || 0;
      return updated;
    });
  };

  const addNewExpense = () => {
    if (!newExpense.expenseCategory.trim() || !newExpense.expenseType.trim()) return;
    setExpenseEntries((prev) => [...prev, { ...newExpense, id: crypto.randomUUID() }]);
    setIsAddExpenseOpen(false);
    setNewExpense({ expenseCategory: "", expenseType: "", name: "", personal: 0, total: 0, points: 0, namePlaceholder: "" });
  };

  const handleSaveExpenses = async () => {
    setExpenseSaving(true);
    try {
      const existing = await storage.getBudgetExpenses();
      const spendRows = existing.filter((e) => SPEND_CATS.includes(e.category));
      const planRows: RegistrationExpense[] = expenseEntries
        .filter((e) => e.personal > 0 || e.name.trim() !== "")
        .map((e) => ({
          id: e.id,
          category: e.expenseCategory as ExpenseCategory,
          type: (e.expenseType === "Fixed" || e.expenseType === "Variable" ? e.expenseType : "Variable") as RegistrationExpense["type"],
          name: e.name.trim() || e.expenseCategory,
          personal: e.personal,
          spouse: 0,
          points: e.points,
          editable: true,
        }));
      await storage.saveBudgetExpenses([...planRows, ...spendRows]);
      if (!isCompleted && planRows.length > 0) {
        const planDone = await markSectionComplete("expenses");
        if (planDone) setIsCompleted(true);
      }
      setExpenseSaved(true);
      setTimeout(() => setExpenseSaved(false), 2500);
    } finally {
      setExpenseSaving(false);
    }
  };

  // ─── Assets handlers ──────────────────────────────────────────────────

  const updateAssetEntry = (index: number, field: keyof AssetEntry, value: string | number) => {
    setAssetEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "personal") updated[index].total = Number(value) || 0;
      return updated;
    });
  };

  const addNewAsset = () => {
    if (!newAsset.expenses.trim() || !newAsset.expenseType.trim()) return;
    setAssetEntries((prev) => [...prev, { ...newAsset, id: crypto.randomUUID() }]);
    setIsAddAssetOpen(false);
    setNewAsset({ expenses: "", expenseType: "", name: "", personal: 0, total: 0, points: 0, interestRate: 0, namePlaceholder: "" });
  };

  const handleSaveAssets = async () => {
    setAssetSaving(true);
    try {
      const toSave: Asset[] = assetEntries
        .filter((e) => e.personal > 0 || e.name.trim() !== "")
        .map((e) => ({
          id: e.id,
          category: e.expenses as AssetCategory,
          type: e.expenseType as Asset["type"],
          name: e.name.trim() || e.expenses,
          personal: e.personal,
          spouse: 0,
          points: e.points,
          interestRate: e.interestRate,
          editable: true,
        }));
      await storage.saveAssets(toSave);
      if (!isCompleted && toSave.length > 0) {
        const planDone = await markSectionComplete("assets");
        if (planDone) setIsCompleted(true);
      }
      setAssetSaved(true);
      setTimeout(() => setAssetSaved(false), 2500);
    } finally {
      setAssetSaving(false);
    }
  };

  // ─── Liabilities handlers ─────────────────────────────────────────────

  const updateLiabilityEntry = (index: number, field: keyof AssetEntry, value: string | number) => {
    setLiabilityEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "personal") updated[index].total = Number(value) || 0;
      return updated;
    });
  };

  const addNewLiability = () => {
    if (!newLiability.expenses.trim() || !newLiability.expenseType.trim()) return;
    setLiabilityEntries((prev) => [...prev, { ...newLiability, id: crypto.randomUUID() }]);
    setIsAddLiabilityOpen(false);
    setNewLiability({ expenses: "", expenseType: "", name: "", personal: 0, total: 0, points: 0, interestRate: 0, namePlaceholder: "" });
  };

  const handleSaveLiabilities = async () => {
    setLiabilitySaving(true);
    try {
      const toSave: Liability[] = liabilityEntries
        .filter((e) => e.expenses !== "Equity" && (e.personal > 0 || e.name.trim() !== ""))
        .map((e) => ({
          id: e.id,
          category: e.expenses as LiabilityCategory,
          type: e.expenseType as Liability["type"],
          name: e.name.trim() || e.expenses,
          personal: e.personal,
          spouse: 0,
          points: e.points,
          interestRate: e.interestRate,
          editable: true,
        }));
      await storage.saveLiabilities(toSave);
      if (!isCompleted && toSave.length > 0) {
        const planDone = await markSectionComplete("liabilities");
        if (planDone) setIsCompleted(true);
      }
      setLiabilitySaved(true);
      setTimeout(() => setLiabilitySaved(false), 2500);
    } finally {
      setLiabilitySaving(false);
    }
  };

  // ─── Shared input styles ──────────────────────────────────────────────

  const inputCls = "w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm";
  const modalInputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white";
  const modalLabelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
  const readonlyCls = `${modalInputCls} bg-gray-100 dark:bg-gray-600 cursor-not-allowed`;

  // ─── Save button helper ───────────────────────────────────────────────

  const SaveBtn = ({
    onClick, saving, saved,
  }: { onClick: () => void; saving: boolean; saved: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all ${
        saved
          ? "bg-green-500"
          : "bg-[#2f6064] hover:bg-[#254e52] disabled:opacity-60"
      }`}
    >
      {saving ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
      ) : saved ? (
        <><Check className="h-4 w-4" /> Saved!</>
      ) : (
        "Save Changes"
      )}
    </button>
  );

  // ─── Totals ───────────────────────────────────────────────────────────

  const totalIncome = incomeEntries.reduce((s, e) => s + (e.personal || 0), 0);

  const totalFixedExp = expenseEntries.filter((e) => e.expenseType === "Fixed").reduce((s, e) => s + (e.personal || 0), 0);
  const totalVarExp   = expenseEntries.filter((e) => e.expenseType === "Variable").reduce((s, e) => s + (e.personal || 0), 0);
  const totalExpenses = totalFixedExp + totalVarExp;

  const totalAssets = assetEntries.reduce((s, e) => s + (e.personal || 0), 0);

  const totalLiabilities = liabilityEntries.reduce((s, e) => s + (e.personal || 0), 0);

  const fmt = (n: number) => `R${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ─── Landing screen (before start) ──────────────────────────────────

  if (loading && !started) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2f6064]" />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2f6064]/10 rounded-full">
          <FileText className="h-10 w-10 text-[#2f6064]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Plan</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
            Track your income, expenses, assets and liabilities in one place to build a complete picture of your finances.
          </p>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="px-8 py-3 bg-[#2f6064] hover:bg-[#254e52] text-white font-semibold rounded-xl transition-colors"
        >
          Start Financial Plan
        </button>
      </div>
    );
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2f6064]" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Plan</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {isCompleted
            ? "Your submitted financial information is shown below. You can edit and save updates at any time."
            : "Enter your income, expenses, assets and liabilities to build your financial plan."}
        </p>
      </div>

      {isCompleted && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-200">
          <Check className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            You have already completed your financial information. Review the saved forms below and edit any details that have changed.
          </p>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Income",      value: fmt(totalIncome),      color: "text-green-600 dark:text-green-400" },
          { label: "Total Expenses",    value: fmt(totalExpenses),    color: "text-red-500 dark:text-red-400" },
          { label: "Total Assets",      value: fmt(totalAssets),      color: "text-blue-600 dark:text-blue-400" },
          { label: "Total Liabilities", value: fmt(totalLiabilities), color: "text-orange-500 dark:text-orange-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 flex-1 justify-center py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-[#2f6064] text-[#2f6064] bg-[#2f6064]/5"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* ── INCOME TAB ── */}
          {activeTab === "income" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Income</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeEntries.map((entry, i) => (
                      <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-1.5 px-2 text-gray-900 dark:text-white whitespace-nowrap">{entry.incomeType}</td>
                        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{entry.source}</td>
                        <td className="py-1.5 px-2">
                          <input type="text" value={entry.name} onChange={(e) => updateIncomeEntry(i, "name", e.target.value)} className={inputCls} placeholder={entry.namePlaceholder} />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={entry.personal || ""} onChange={(e) => updateIncomeEntry(i, "personal", parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0" min="0" step="0.01" />
                        </td>
                        <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{fmt(entry.personal || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Income totals */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Personal</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(totalIncome)}</p>
                </div>
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Income</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(totalIncome)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setIsAddIncomeOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-[#2f6064] text-[#2f6064] rounded-lg hover:bg-[#2f6064]/5 text-sm font-medium transition-colors">
                  <Plus className="h-4 w-4" /> Add Income Source
                </button>
                <SaveBtn onClick={handleSaveIncome} saving={incomeSaving} saved={incomeSaved} />
              </div>
            </div>
          )}

          {/* ── EXPENSES TAB ── */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Expense</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseEntries.map((entry, i) => (
                      <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-1.5 px-2 text-gray-900 dark:text-white whitespace-nowrap">{entry.expenseCategory}</td>
                        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{entry.expenseType}</td>
                        <td className="py-1.5 px-2">
                          <input type="text" value={entry.name} onChange={(e) => updateExpenseEntry(i, "name", e.target.value)} className={inputCls} placeholder={entry.namePlaceholder} />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={entry.personal || ""} onChange={(e) => updateExpenseEntry(i, "personal", parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0" min="0" step="0.01" />
                        </td>
                        <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{fmt(entry.personal || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expense totals */}
              <div className="grid grid-cols-3 gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fixed</p>
                  <p className="text-lg font-bold text-red-500">{fmt(totalFixedExp)}</p>
                </div>
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Variable</p>
                  <p className="text-lg font-bold text-orange-500">{fmt(totalVarExp)}</p>
                </div>
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(totalExpenses)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setIsAddExpenseOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-[#2f6064] text-[#2f6064] rounded-lg hover:bg-[#2f6064]/5 text-sm font-medium transition-colors">
                  <Plus className="h-4 w-4" /> Add Expense
                </button>
                <SaveBtn onClick={handleSaveExpenses} saving={expenseSaving} saved={expenseSaved} />
              </div>
            </div>
          )}

          {/* ── ASSETS TAB ── */}
          {activeTab === "assets" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Asset</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Asset Type</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Total</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Interest Rate*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetEntries.map((entry, i) => (
                      <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-1.5 px-2 text-gray-900 dark:text-white whitespace-nowrap">{entry.expenses}</td>
                        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{entry.expenseType}</td>
                        <td className="py-1.5 px-2">
                          <input type="text" value={entry.name} onChange={(e) => updateAssetEntry(i, "name", e.target.value)} className={inputCls} placeholder={entry.namePlaceholder} />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={entry.personal || ""} onChange={(e) => updateAssetEntry(i, "personal", parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0" step="0.01" />
                        </td>
                        <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{fmt(entry.personal || 0)}</td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={entry.interestRate || ""} onChange={(e) => updateAssetEntry(i, "interestRate", parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0.00" min="0" step="0.01" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                * Where applicable — enter the annual growth rate, appreciation or return you wish to achieve with this asset/investment.
              </div>

              {/* Asset totals */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Personal</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(totalAssets)}</p>
                </div>
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Assets</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(totalAssets)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setIsAddAssetOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-[#2f6064] text-[#2f6064] rounded-lg hover:bg-[#2f6064]/5 text-sm font-medium transition-colors">
                  <Plus className="h-4 w-4" /> Add Asset
                </button>
                <SaveBtn onClick={handleSaveAssets} saving={assetSaving} saved={assetSaved} />
              </div>
            </div>
          )}

          {/* ── LIABILITIES TAB ── */}
          {activeTab === "liabilities" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Liability</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Liability Type</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Personal</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Total</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-700 dark:text-gray-300">Interest Rate*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liabilityEntries.map((entry, i) => (
                      <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-1.5 px-2 text-gray-900 dark:text-white whitespace-nowrap">{entry.expenses}</td>
                        <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{entry.expenseType}</td>
                        <td className="py-1.5 px-2">
                          <input type="text" value={entry.name} onChange={(e) => updateLiabilityEntry(i, "name", e.target.value)} className={inputCls} placeholder={entry.namePlaceholder} />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={entry.personal || ""} onChange={(e) => updateLiabilityEntry(i, "personal", parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0" min="0" step="0.01" />
                        </td>
                        <td className="py-1.5 px-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{fmt(entry.personal || 0)}</td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={entry.interestRate || ""} onChange={(e) => updateLiabilityEntry(i, "interestRate", parseFloat(e.target.value) || 0)} className={inputCls} placeholder="0.00" min="0" step="0.01" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-200">
                * Please enter the interest rate you are currently paying on the loan or credit facility to ensure you are not being exploited.
              </div>

              {/* Liability totals */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Personal</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(totalLiabilities)}</p>
                </div>
                <div className="text-center bg-gray-50 dark:bg-gray-700/30 rounded-lg py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Liabilities</p>
                  <p className="text-lg font-bold text-red-500">{fmt(totalLiabilities)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setIsAddLiabilityOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-[#2f6064] text-[#2f6064] rounded-lg hover:bg-[#2f6064]/5 text-sm font-medium transition-colors">
                  <Plus className="h-4 w-4" /> Add Liability
                </button>
                <SaveBtn onClick={handleSaveLiabilities} saving={liabilitySaving} saved={liabilitySaved} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Add Income Modal */}
      {isAddIncomeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Income Source</h3>
            <div className="space-y-3">
              <div><label className={modalLabelCls}>Income Category</label><input type="text" value={newIncome.incomeType} onChange={(e) => setNewIncome((p) => ({ ...p, incomeType: e.target.value }))} className={modalInputCls} placeholder="e.g. Salary, Business Income" /></div>
              <div><label className={modalLabelCls}>Income Type</label><select value={newIncome.source} onChange={(e) => setNewIncome((p) => ({ ...p, source: e.target.value }))} className={modalInputCls}><option value="">Select Type</option><option value="Fixed">Fixed</option><option value="Variable">Variable</option></select></div>
              <div><label className={modalLabelCls}>Name</label><input type="text" value={newIncome.name} onChange={(e) => setNewIncome((p) => ({ ...p, name: e.target.value }))} className={modalInputCls} placeholder="e.g. Employer Name" /></div>
              <div><label className={modalLabelCls}>Personal Amount</label><input type="number" value={newIncome.personal || ""} onChange={(e) => setNewIncome((p) => { const v = parseFloat(e.target.value) || 0; return { ...p, personal: v, total: v }; })} className={modalInputCls} placeholder="0.00" min="0" step="0.01" /></div>
              <div><label className={modalLabelCls}>Points</label><input type="number" value={newIncome.points} onChange={(e) => setNewIncome((p) => ({ ...p, points: parseInt(e.target.value) || 0 }))} className={modalInputCls} placeholder="0" min="0" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setIsAddIncomeOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
              <button type="button" onClick={addNewIncome} disabled={!newIncome.incomeType.trim()} className="px-5 py-2 bg-[#2f6064] hover:bg-[#254e52] disabled:bg-gray-400 text-white rounded-lg transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Expense</h3>
            <div className="space-y-3">
              <div><label className={modalLabelCls}>Category</label><input type="text" value={newExpense.expenseCategory} onChange={(e) => setNewExpense((p) => ({ ...p, expenseCategory: e.target.value }))} className={modalInputCls} placeholder="e.g. Groceries, Rent" /></div>
              <div><label className={modalLabelCls}>Type</label><select value={newExpense.expenseType} onChange={(e) => setNewExpense((p) => ({ ...p, expenseType: e.target.value }))} className={modalInputCls}><option value="">Select Type</option><option value="Fixed">Fixed</option><option value="Variable">Variable</option></select></div>
              <div><label className={modalLabelCls}>Name</label><input type="text" value={newExpense.name} onChange={(e) => setNewExpense((p) => ({ ...p, name: e.target.value }))} className={modalInputCls} placeholder="Specific name" /></div>
              <div><label className={modalLabelCls}>Personal Amount</label><input type="number" value={newExpense.personal || ""} onChange={(e) => setNewExpense((p) => { const v = parseFloat(e.target.value) || 0; return { ...p, personal: v, total: v }; })} className={modalInputCls} placeholder="0.00" min="0" step="0.01" /></div>
              <div><label className={modalLabelCls}>Total (auto)</label><input type="text" value={fmt(newExpense.total)} readOnly className={readonlyCls} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setIsAddExpenseOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
              <button type="button" onClick={addNewExpense} disabled={!newExpense.expenseCategory.trim() || !newExpense.expenseType.trim()} className="px-5 py-2 bg-[#2f6064] hover:bg-[#254e52] disabled:bg-gray-400 text-white rounded-lg transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Asset</h3>
            <div className="space-y-3">
              <div><label className={modalLabelCls}>Asset</label><input type="text" value={newAsset.expenses} onChange={(e) => setNewAsset((p) => ({ ...p, expenses: e.target.value }))} className={modalInputCls} placeholder="Asset name" /></div>
              <div><label className={modalLabelCls}>Asset Type</label><select value={newAsset.expenseType} onChange={(e) => setNewAsset((p) => ({ ...p, expenseType: e.target.value }))} className={modalInputCls}><option value="">Select Type</option><option value="Fixed Assets">Fixed Assets</option><option value="Current Assets">Current Assets</option></select></div>
              <div><label className={modalLabelCls}>Name</label><input type="text" value={newAsset.name} onChange={(e) => setNewAsset((p) => ({ ...p, name: e.target.value }))} className={modalInputCls} placeholder="Specific name" /></div>
              <div><label className={modalLabelCls}>Personal Amount</label><input type="number" value={newAsset.personal || ""} onChange={(e) => setNewAsset((p) => { const v = parseFloat(e.target.value) || 0; return { ...p, personal: v, total: v }; })} className={modalInputCls} placeholder="0.00" min="0" step="0.01" /></div>
              <div><label className={modalLabelCls}>Interest Rate*</label><input type="number" value={newAsset.interestRate || ""} onChange={(e) => setNewAsset((p) => ({ ...p, interestRate: parseFloat(e.target.value) || 0 }))} className={modalInputCls} placeholder="0.00" min="0" step="0.01" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setIsAddAssetOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
              <button type="button" onClick={addNewAsset} disabled={!newAsset.expenses.trim() || !newAsset.expenseType.trim()} className="px-5 py-2 bg-[#2f6064] hover:bg-[#254e52] disabled:bg-gray-400 text-white rounded-lg transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Liability Modal */}
      {isAddLiabilityOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add New Liability</h3>
            <div className="space-y-3">
              <div><label className={modalLabelCls}>Liability</label><input type="text" value={newLiability.expenses} onChange={(e) => setNewLiability((p) => ({ ...p, expenses: e.target.value }))} className={modalInputCls} placeholder="Liability name" /></div>
              <div><label className={modalLabelCls}>Liability Type</label><select value={newLiability.expenseType} onChange={(e) => setNewLiability((p) => ({ ...p, expenseType: e.target.value }))} className={modalInputCls}><option value="">Select Type</option><option value="Long Term Liabilities">Long Term Liabilities</option><option value="Short Term Liabilities">Short Term Liabilities</option></select></div>
              <div><label className={modalLabelCls}>Name</label><input type="text" value={newLiability.name} onChange={(e) => setNewLiability((p) => ({ ...p, name: e.target.value }))} className={modalInputCls} placeholder="Specific name" /></div>
              <div><label className={modalLabelCls}>Personal Amount</label><input type="number" value={newLiability.personal || ""} onChange={(e) => setNewLiability((p) => { const v = parseFloat(e.target.value) || 0; return { ...p, personal: v, total: v }; })} className={modalInputCls} placeholder="0.00" min="0" step="0.01" /></div>
              <div><label className={modalLabelCls}>Interest Rate*</label><input type="number" value={newLiability.interestRate || ""} onChange={(e) => setNewLiability((p) => ({ ...p, interestRate: parseFloat(e.target.value) || 0 }))} className={modalInputCls} placeholder="0.00" min="0" step="0.01" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setIsAddLiabilityOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
              <button type="button" onClick={addNewLiability} disabled={!newLiability.expenses.trim() || !newLiability.expenseType.trim()} className="px-5 py-2 bg-[#2f6064] hover:bg-[#254e52] disabled:bg-gray-400 text-white rounded-lg transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
