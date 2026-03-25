"use client";

import { useState, useEffect } from "react";
import { UserProfile, Income, RegistrationExpense } from "@/types";
import { storage } from "@/lib/storage";
import {
  Wallet,
  AlertCircle,
  CheckCircle,
  CreditCard,
  DollarSign,
  TrendingUp,
  Receipt,
} from "lucide-react";

type IconItem = { id: string; key: string; label: string; amount?: number; category?: string; name?: string };

// Map income category to icon key for pooled icons
function incomeIconKey(category: string): string {
  const m: Record<string, string> = {
    Salary: "wallet",
    "Rental Income": "bank",
    Bonus: "wallet",
    "Side Hustle": "cash",
    "Board Fees": "wallet",
    Commission: "cash",
    "Business Income": "bank",
    Pension: "wallet",
    "Retirement Annuities": "bank",
    Dividends: "bank",
    "Interest Income": "bank",
    "Sales of Goods": "cash",
  };
  return m[category] ?? "wallet";
}

// Map expense category to icon key for pooled icons
function expenseIconKey(_category: string): string {
  return "card";
}

export default function BudgetManager() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [onboardingIncome, setOnboardingIncome] = useState<Income[]>([]);
  const [onboardingExpenses, setOnboardingExpenses] = useState<RegistrationExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Draggable: Bank account (left) ↔ Income (right)
  const [accounts, setAccounts] = useState<IconItem[]>([
    { id: "acc-bank1", key: "bank", label: "Bank 1" },
    { id: "acc-bank2", key: "bank", label: "Bank 2" },
    { id: "acc-savings1", key: "bank", label: "Savings 1" },
    { id: "acc-savings2", key: "bank", label: "Savings 2" },
    { id: "acc-invest1", key: "bank", label: "Investment 1" },
    { id: "acc-invest2", key: "bank", label: "Investment 2" },
    { id: "acc-cash1", key: "cash", label: "Cash 1" },
    { id: "acc-cash2", key: "cash", label: "Cash 2" },
    { id: "acc-wallet", key: "wallet", label: "Wallet" },
  ]);

  const [incomeIcons, setIncomeIcons] = useState<IconItem[]>([]);
  const [expenseIcons, setExpenseIcons] = useState<IconItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userProfile, expenses, incomeList, budgetExpensesList] = await Promise.all([
        storage.getProfile(),
        storage.getExpenses(),
        storage.getIncome(),
        storage.getBudgetExpenses(),
      ]);
      setProfile(userProfile);
      setOnboardingIncome(incomeList);
      setOnboardingExpenses(budgetExpensesList);

      // Pooled data as icons: income (draggable between accounts & income), expenses (icons only)
      if (incomeList.length > 0) {
        setIncomeIcons(
          incomeList
            .filter((i) => (Number(i.personal) || 0) + (Number(i.spouse) || 0) > 0)
            .map((i) => ({
              id: i.id,
              key: incomeIconKey(i.category),
              label: i.name && i.name.trim() ? i.name : i.category,
              amount: (Number(i.personal) || 0) + (Number(i.spouse) || 0),
              category: i.category,
              name: i.name && i.name.trim() ? i.name : undefined,
            }))
        );
      } else {
        setIncomeIcons([
          { id: "inc-salary", key: "wallet", label: "Salary" },
          { id: "inc-freelance", key: "wallet", label: "Freelance" },
        ]);
      }
      if (budgetExpensesList.length > 0) {
        setExpenseIcons(
          budgetExpensesList
            .filter((e) => (Number(e.personal) || 0) + (Number(e.spouse) || 0) > 0)
            .map((e) => ({
              id: e.id,
              key: expenseIconKey(e.category),
              label: e.name && e.name.trim() ? e.name : e.category,
              amount: (Number(e.personal) || 0) + (Number(e.spouse) || 0),
              category: e.category,
              name: e.name && e.name.trim() ? e.name : undefined,
            }))
        );
      } else {
        setExpenseIcons([
          { id: "exp-rent", key: "card", label: "Rent" },
          { id: "exp-groceries", key: "cash", label: "Groceries" },
        ]);
      }

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = expenses
        .filter((exp) => {
          const expDate = new Date(exp.date);
          return (
            expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      setTotalExpenses(monthlyExpenses);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  // Icon component mapping
  const ICONS: Record<string, any> = {
    bank: CreditCard,
    card: CreditCard,
    wallet: Wallet,
    cash: DollarSign,
  };

  // Drag & drop handlers: only allow between 'accounts' and 'income'
  const handleDragStart = (e: React.DragEvent, item: IconItem, source: "accounts" | "income") => {
    e.dataTransfer.setData("application/json", JSON.stringify({ item, source }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, target: "accounts" | "income" | "expenses") => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const { item, source } = JSON.parse(raw) as { item: IconItem; source: string };

      // Only allow moves between accounts and income
      if (!((source === "accounts" && target === "income") || (source === "income" && target === "accounts"))) {
        return;
      }

      if (source === "accounts" && target === "income") {
        setAccounts((prev) => prev.filter((p) => p.id !== item.id));
        setIncomeIcons((prev) => [...prev, item]);
      } else if (source === "income" && target === "accounts") {
        setIncomeIcons((prev) => prev.filter((p) => p.id !== item.id));
        setAccounts((prev) => [...prev, item]);
      }
    } catch (err) {
      // ignore malformed data
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Pool income and expenses from onboarding (personal + spouse per item)
  const pooledIncome =
    onboardingIncome.length > 0
      ? onboardingIncome.reduce((sum, i) => sum + (Number(i.personal) || 0) + (Number(i.spouse) || 0), 0)
      : (profile?.monthlyIncome ?? 0);
  const pooledExpenses =
    onboardingExpenses.length > 0
      ? onboardingExpenses.reduce((sum, e) => sum + (Number(e.personal) || 0) + (Number(e.spouse) || 0), 0)
      : (profile?.lastExpenses ?? 0);

  const monthlyIncome = pooledIncome;
  const budgetTarget = monthlyIncome * 0.8; // 80% of income as budget
  const remainingBudget = budgetTarget - totalExpenses;
  const budgetProgress = budgetTarget > 0 ? Math.min(100, (totalExpenses / budgetTarget) * 100) : 0;
  const isOverBudget = totalExpenses > budgetTarget;

  return (
    <div>
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-[#2f6064]/10">
              <Wallet className="h-6 w-6 text-[#2f6064]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overview, accounts, income and expenses</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">{new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Left vertical bar */}
        <aside
          className="col-span-2 flex flex-col items-center space-y-6 py-6"
          onDrop={(e) => handleDrop(e as React.DragEvent, "accounts")}
          onDragOver={handleDragOver}
        >
          <div className="text-sm font-semibold">Bank account</div>
          <div className="flex flex-col items-center gap-4">
            {accounts.map((acc) => {
              const Icon = ICONS[acc.key] || Wallet;
              const title = acc.amount != null ? `${acc.label}: $${acc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : acc.label;
              const showName = acc.name && acc.category && acc.name !== acc.category;
              return (
                <div
                  key={acc.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, acc, "accounts")}
                  className="flex flex-col items-center cursor-grab active:cursor-grabbing select-none min-w-[88px]"
                  title={title}
                >
                  <div className="p-3 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-blue-400 transition-shadow">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  {acc.category && (
                    <span className="text-[10px] mt-1 text-gray-500 dark:text-gray-400 text-center max-w-[88px] truncate" title={`Category: ${acc.category}`}>
                      Category: {acc.category}
                    </span>
                  )}
                  {showName && (
                    <span className="text-[10px] text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate" title={`Name: ${acc.name}`}>
                      Name: {acc.name}
                    </span>
                  )}
                  {!acc.category && (
                    <span className="text-xs mt-1 text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate" title={acc.label}>{acc.label}</span>
                  )}
                  {acc.amount != null && acc.amount > 0 && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                      ${acc.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="mt-2 w-full min-h-10 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <span className="text-[10px] text-gray-400 text-center px-1">Drop income here</span>
            </div>
          </div>
        </aside>

        {/* Right area: three rows */}
        <main className="col-span-10 space-y-6">
          {/* Row 1: Pooled overview (onboarding + this month) */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">This month</h2>
              {isOverBudget ? <AlertCircle className="h-6 w-6 text-red-500" /> : <CheckCircle className="h-6 w-6 text-green-500" />}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Income (onboarding)</div>
                <div className="text-xl font-bold text-[#2f6064]">${pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Planned expenses (onboarding)</div>
                <div className="text-xl font-bold">${pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Spent this month</div>
                <div className={`text-xl font-bold ${totalExpenses > pooledExpenses ? "text-red-600 dark:text-red-400" : ""}`}>${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Remaining (vs 80% budget)</div>
                <div className={`text-xl font-bold ${remainingBudget < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  ${remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Income (pooled as icons, draggable to/from Accounts) */}
          <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            onDrop={(e) => handleDrop(e as React.DragEvent, "income")}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2f6064]" />
                Income
              </h3>
              {pooledIncome > 0 && (
                <span className="text-sm font-semibold text-[#2f6064]">
                  Total: ${pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {incomeIcons.map((inc) => {
                const Icon = ICONS[inc.key] || Wallet;
                const title = inc.amount != null ? `${inc.label}: $${inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : inc.label;
                const showName = inc.name && inc.category && inc.name !== inc.category;
                return (
                  <div
                    key={inc.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, inc, "income")}
                    className="flex flex-col items-center cursor-grab active:cursor-grabbing select-none min-w-[88px]"
                    title={title}
                  >
                    <div className="p-3 rounded-full bg-[#2f6064]/5 dark:bg-[#2f6064]/10 border border-[#2f6064]/20 hover:ring-2 hover:ring-[#2f6064]/40 transition-shadow">
                      <Icon className="h-6 w-6 text-[#2f6064]" />
                    </div>
                    {inc.category && (
                      <span className="text-[10px] mt-1 text-gray-500 dark:text-gray-400 text-center max-w-[88px] truncate" title={`Category: ${inc.category}`}>
                        Category: {inc.category}
                      </span>
                    )}
                    {showName && (
                      <span className="text-[10px] text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate" title={`Name: ${inc.name}`}>
                        Name: {inc.name}
                      </span>
                    )}
                    {!inc.category && (
                      <span className="text-xs mt-1 text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate" title={inc.label}>{inc.label}</span>
                    )}
                    {inc.amount != null && inc.amount > 0 && (
                      <span className="text-[10px] text-[#2f6064] font-medium mt-0.5">
                        ${inc.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="flex-1 min-w-[100px] h-20 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-xs text-gray-400 text-center px-2">Drop accounts here</span>
              </div>
            </div>
          </div>

          {/* Row 3: Planned expenses (pooled as icons) */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-600" />
                Planned expenses
              </h3>
              {pooledExpenses > 0 && (
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total: ${pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {expenseIcons.map((exp) => {
                const Icon = ICONS[exp.key] || CreditCard;
                const title = exp.amount != null ? `${exp.label}: $${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : exp.label;
                const showName = exp.name && exp.category && exp.name !== exp.category;
                return (
                  <div
                    key={exp.id}
                    className="flex flex-col items-center select-none min-w-[88px]"
                    title={title}
                  >
                    <div className="p-3 rounded-full bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800">
                      <Icon className="h-6 w-6 text-orange-600" />
                    </div>
                    {exp.category && (
                      <span className="text-[10px] mt-1 text-gray-500 dark:text-gray-400 text-center max-w-[88px] truncate" title={`Category: ${exp.category}`}>
                        Category: {exp.category}
                      </span>
                    )}
                    {showName && (
                      <span className="text-[10px] text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate" title={`Name: ${exp.name}`}>
                        Name: {exp.name}
                      </span>
                    )}
                    {!exp.category && (
                      <span className="text-xs mt-1 text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate" title={exp.label}>{exp.label}</span>
                    )}
                    {exp.amount != null && exp.amount > 0 && (
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                        ${exp.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
