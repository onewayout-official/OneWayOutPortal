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
  Landmark,
  PiggyBank,
  BarChart3,
  Banknote,
  Plus,
  X,
  ArrowLeft,
  GripVertical,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type IconItem = {
  id: string;
  key: string;
  label: string;
  amount?: number;
  category?: string;
  name?: string;
};

type UserAccount = {
  id: string;
  accountType: string;
  name: string;
  sortOrder: number;
};

const ACCOUNT_TYPE_META: { type: string; label: string; icon: LucideIcon; color: string }[] = [
  { type: "bank", label: "Bank", icon: Landmark, color: "blue" },
  { type: "savings", label: "Savings", icon: PiggyBank, color: "emerald" },
  { type: "investment", label: "Investment", icon: BarChart3, color: "violet" },
  { type: "cash", label: "Cash", icon: Banknote, color: "amber" },
  { type: "wallet", label: "Wallet", icon: Wallet, color: "teal" },
];

const INCOME_ICON_MAP: Record<string, string> = {
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

const ICONS: Record<string, LucideIcon> = {
  bank: Landmark,
  card: CreditCard,
  wallet: Wallet,
  cash: DollarSign,
};

const COLOR_MAP: Record<string, { text: string; bg: string; border: string; ring: string }> = {
  blue:    { text: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-900/20",       border: "border-blue-200 dark:border-blue-800",       ring: "ring-blue-400" },
  emerald: { text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", ring: "ring-emerald-400" },
  violet:  { text: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-900/20",   border: "border-violet-200 dark:border-violet-800",   ring: "ring-violet-400" },
  amber:   { text: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/20",     border: "border-amber-200 dark:border-amber-800",     ring: "ring-amber-400" },
  teal:    { text: "text-teal-600",    bg: "bg-teal-50 dark:bg-teal-900/20",       border: "border-teal-200 dark:border-teal-800",       ring: "ring-teal-400" },
};

function IconCard({
  item,
  draggable,
  onDragStart,
  colorClass = "text-[#2f6064]",
  bgClass = "bg-[#2f6064]/5 dark:bg-[#2f6064]/10 border-[#2f6064]/20",
  hoverRing = "hover:ring-[#2f6064]/40",
}: {
  item: IconItem;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  colorClass?: string;
  bgClass?: string;
  hoverRing?: string;
}) {
  const Icon = ICONS[item.key] || Wallet;
  const title =
    item.amount != null
      ? `${item.label}: N$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : item.label;
  const showName = item.name && item.category && item.name !== item.category;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`flex flex-col items-center select-none min-w-[88px] ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      title={title}
    >
      <div
        className={`p-3 rounded-full border ${bgClass} ${draggable ? `hover:ring-2 ${hoverRing}` : ""} transition-shadow`}
      >
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
      {item.category && (
        <span className="text-[10px] mt-1 text-gray-500 dark:text-gray-400 text-center max-w-[88px] truncate">
          {item.category}
        </span>
      )}
      {showName && (
        <span className="text-[10px] text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate">
          {item.name}
        </span>
      )}
      {!item.category && (
        <span className="text-xs mt-1 text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate">
          {item.label}
        </span>
      )}
      {item.amount != null && item.amount > 0 && (
        <span className={`text-[10px] ${colorClass} font-medium mt-0.5`}>
          N${item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

export default function BudgetManager() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [onboardingIncome, setOnboardingIncome] = useState<Income[]>([]);
  const [onboardingExpenses, setOnboardingExpenses] = useState<RegistrationExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [allIncomeIcons, setAllIncomeIcons] = useState<IconItem[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [allocations, setAllocations] = useState<Map<string, string>>(new Map());
  const [expenseIcons, setExpenseIcons] = useState<IconItem[]>([]);
  const [monthlyExpensesByAccount, setMonthlyExpensesByAccount] = useState<Map<string, number>>(new Map());
  // account → expense allocations: key = `${accountId}::${expenseId}`
  const [expenseAllocations, setExpenseAllocations] = useState<Map<string, number>>(new Map());
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingAccount, setIsDraggingAccount] = useState(false);
  const [addingAccountType, setAddingAccountType] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState("");

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Allocation modal state
  const [allocModal, setAllocModal] = useState<{
    accountId: string;
    accountName: string;
    expenseId: string;
    expenseLabel: string;
    existing: number;
  } | null>(null);
  const [allocAmount, setAllocAmount] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userProfile, expenses, incomeList, budgetExpensesList, accounts, savedAllocations, expenseAllocs] =
        await Promise.all([
          storage.getProfile(),
          storage.getExpenses(),
          storage.getIncome(),
          storage.getBudgetExpenses(),
          storage.getUserAccounts(),
          storage.getIncomeAllocations(),
          storage.getAccountExpenseAllocations(),
        ]);

      setProfile(userProfile);
      setOnboardingIncome(incomeList);
      setOnboardingExpenses(budgetExpensesList);
      setUserAccounts(accounts);

      const incomeItems: IconItem[] =
        incomeList.length > 0
          ? incomeList
              .filter((i) => (Number(i.personal) || 0) > 0)
              .map((i) => ({
                id: i.id,
                key: INCOME_ICON_MAP[i.category] ?? "wallet",
                label: i.name && i.name.trim() ? i.name : i.category,
                amount: Number(i.personal) || 0,
                category: i.category,
                name: i.name && i.name.trim() ? i.name : undefined,
              }))
          : [];
      setAllIncomeIcons(incomeItems);

      const allocMap = new Map<string, string>();
      for (const a of savedAllocations) {
        allocMap.set(a.incomeId, a.accountId);
      }
      setAllocations(allocMap);

      if (budgetExpensesList.length > 0) {
        setExpenseIcons(
          budgetExpensesList
            .filter((e) => (Number(e.personal) || 0) > 0)
            .map((e) => ({
              id: e.id,
              key: "card",
              label: e.name && e.name.trim() ? e.name : e.category,
              amount: Number(e.personal) || 0,
              category: e.category,
              name: e.name && e.name.trim() ? e.name : undefined,
            }))
        );
      } else {
        setExpenseIcons([]);
      }

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      });
      const monthlyExpenses = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      setTotalExpenses(monthlyExpenses);

      const byAccount = new Map<string, number>();
      for (const exp of thisMonthExpenses) {
        if (exp.accountId) {
          byAccount.set(exp.accountId, (byAccount.get(exp.accountId) ?? 0) + exp.amount);
        }
      }
      setMonthlyExpensesByAccount(byAccount);

      const expAllocMap = new Map<string, number>();
      for (const a of expenseAllocs) {
        expAllocMap.set(`${a.accountId}::${a.expenseId}`, a.amount);
      }
      setExpenseAllocations(expAllocMap);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const unallocatedIncome = allIncomeIcons.filter((i) => !allocations.has(i.id));

  const getItemsForAccount = (accountId: string): IconItem[] =>
    allIncomeIcons.filter((i) => allocations.get(i.id) === accountId);

  const getAccountIncome = (accountId: string): number =>
    getItemsForAccount(accountId).reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const getAccountExpenses = (accountId: string): number =>
    monthlyExpensesByAccount.get(accountId) ?? 0;

  const getAccountAllocated = (accountId: string): number => {
    let total = 0;
    for (const [key, amount] of expenseAllocations) {
      if (key.startsWith(`${accountId}::`)) total += amount;
    }
    return total;
  };

  const getAccountTotal = (accountId: string): number =>
    getAccountIncome(accountId) - getAccountExpenses(accountId) - getAccountAllocated(accountId);

  const getAllocForExpense = (accountId: string, expenseId: string): number =>
    expenseAllocations.get(`${accountId}::${expenseId}`) ?? 0;

  const getTotalAllocForExpense = (expenseId: string): number => {
    let total = 0;
    for (const [key, amount] of expenseAllocations) {
      if (key.endsWith(`::${expenseId}`)) total += amount;
    }
    return total;
  };

  const handleDragStart = (e: React.DragEvent, item: IconItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    const onEnd = () => { setIsDragging(false); document.removeEventListener("dragend", onEnd); };
    document.addEventListener("dragend", onEnd);
  };

  const handleAccountDragStart = (e: React.DragEvent, acc: UserAccount) => {
    e.dataTransfer.setData("application/account-json", JSON.stringify(acc));
    e.dataTransfer.effectAllowed = "copy";
    setIsDraggingAccount(true);
    const onEnd = () => { setIsDraggingAccount(false); document.removeEventListener("dragend", onEnd); };
    document.addEventListener("dragend", onEnd);
  };

  const handleDropOnExpense = (e: React.DragEvent, expItem: IconItem) => {
    e.preventDefault();
    setDragOverTarget(null);
    const raw = e.dataTransfer.getData("application/account-json");
    if (!raw) return;
    try {
      const acc: UserAccount = JSON.parse(raw);
      const existing = getAllocForExpense(acc.id, expItem.id);
      setAllocAmount(existing > 0 ? String(existing) : "");
      setAllocModal({
        accountId: acc.id,
        accountName: acc.name,
        expenseId: expItem.id,
        expenseLabel: expItem.name ?? expItem.category ?? expItem.label,
        existing,
      });
    } catch { /* ignore */ }
  };

  const handleSaveAllocation = async () => {
    if (!allocModal) return;
    const amount = parseFloat(allocAmount);
    if (isNaN(amount) || amount < 0) return;
    try {
      if (amount === 0) {
        await storage.deleteAccountExpenseAllocation(allocModal.accountId, allocModal.expenseId);
        setExpenseAllocations((prev) => {
          const next = new Map(prev);
          next.delete(`${allocModal.accountId}::${allocModal.expenseId}`);
          return next;
        });
      } else {
        await storage.saveAccountExpenseAllocation(allocModal.accountId, allocModal.expenseId, amount);
        setExpenseAllocations((prev) =>
          new Map(prev).set(`${allocModal.accountId}::${allocModal.expenseId}`, amount)
        );
      }
    } catch (err) {
      console.error(err);
    }
    setAllocModal(null);
    setAllocAmount("");
  };

  const handleDropOnAccount = async (e: React.DragEvent, accountId: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    try {
      const item: IconItem = JSON.parse(e.dataTransfer.getData("application/json"));
      if (allocations.get(item.id) === accountId) return;

      setAllocations((prev) => new Map(prev).set(item.id, accountId));
      await storage.saveIncomeAllocation(item.id, accountId);
    } catch {
      // ignore malformed data
    }
  };

  const handleDropOnUnallocated = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    try {
      const item: IconItem = JSON.parse(e.dataTransfer.getData("application/json"));
      if (!allocations.has(item.id)) return;

      setAllocations((prev) => {
        const next = new Map(prev);
        next.delete(item.id);
        return next;
      });
      await storage.removeIncomeAllocation(item.id);
    } catch {
      // ignore malformed data
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAddAccount = async (accountType: string) => {
    const name = newAccountName.trim();
    if (!name) return;
    try {
      const id = await storage.createUserAccount(accountType, name);
      setUserAccounts((prev) => [...prev, { id, accountType, name, sortOrder: prev.length }]);
      setNewAccountName("");
      setAddingAccountType(null);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteAccount = (acc: UserAccount) => {
    setDeleteConfirm({ id: acc.id, name: acc.name });
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) return;
    const accountId = deleteConfirm.id;
    try {
      await storage.deleteUserAccount(accountId);
      setUserAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setAllocations((prev) => {
        const next = new Map(prev);
        for (const [incomeId, accId] of next) {
          if (accId === accountId) next.delete(incomeId);
        }
        return next;
      });
      setExpenseAllocations((prev) => {
        const next = new Map(prev);
        for (const key of next.keys()) {
          if (key.startsWith(`${accountId}::`)) next.delete(key);
        }
        return next;
      });
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const pooledIncome =
    onboardingIncome.length > 0
      ? onboardingIncome.reduce((sum, i) => sum + (Number(i.personal) || 0), 0)
      : (profile?.monthlyIncome ?? 0);
  const pooledExpenses =
    onboardingExpenses.length > 0
      ? onboardingExpenses.reduce((sum, e) => sum + (Number(e.personal) || 0), 0)
      : (profile?.lastExpenses ?? 0);

  const monthlyIncome = pooledIncome;
  const budgetTarget = monthlyIncome * 0.8;
  const remainingBudget = budgetTarget - totalExpenses;
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
          <div className="text-sm text-gray-500">
            {new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Left vertical bar — account drop zones grouped by type */}
        <aside className="col-span-2 flex flex-col items-center space-y-4 py-6">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Accounts</div>

          {ACCOUNT_TYPE_META.map(({ type, label, icon: TypeIcon, color }) => {
            const c = COLOR_MAP[color];
            const accountsOfType = userAccounts.filter((a) => a.accountType === type);

            return (
              <div key={type} className="w-full space-y-2">
                {/* Type header with add button */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className={`h-4 w-4 ${c.text}`} />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAddingAccountType(addingAccountType === type ? null : type);
                      setNewAccountName("");
                    }}
                    className={`p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${c.text}`}
                    title={`Add ${label} account`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Inline add form */}
                {addingAccountType === type && (
                  <div className="flex gap-1 px-1">
                    <input
                      autoFocus
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddAccount(type); if (e.key === "Escape") setAddingAccountType(null); }}
                      placeholder={`e.g. ${label} 1`}
                      className="flex-1 min-w-0 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      onClick={() => handleAddAccount(type)}
                      className={`px-2 py-1 text-xs font-medium text-white rounded ${c.text.replace("text-", "bg-")} hover:opacity-90`}
                    >
                      Add
                    </button>
                  </div>
                )}

                {/* Individual accounts as drop zones */}
                {accountsOfType.map((acc) => {
                  const items = getItemsForAccount(acc.id);
                  const total = getAccountTotal(acc.id);
                  const isOver = dragOverTarget === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className={`w-full rounded-xl border-2 p-3 transition-all ${
                        isOver
                          ? `${c.border} ${c.ring} ring-2 scale-[1.02]`
                          : isDragging
                            ? `border-gray-300 dark:border-gray-600 ${c.ring}/30 ring-1 animate-pulse`
                            : "border-gray-200 dark:border-gray-700"
                      }`}
                      onDrop={(e) => handleDropOnAccount(e, acc.id)}
                      onDragOver={(e) => { handleDragOver(e); setDragOverTarget(acc.id); }}
                      onDragLeave={() => setDragOverTarget(null)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex flex-col items-start gap-0.5">
                          {/* Drag handle to allocate from this account to expenses */}
                          <div className="flex items-center gap-1">
                            <div
                              draggable
                              onDragStart={(e) => handleAccountDragStart(e, acc)}
                              className={`cursor-grab active:cursor-grabbing p-0.5 rounded ${c.text} hover:${c.bg} transition-colors`}
                              title={`Drag to a planned expense to allocate budget from ${acc.name}`}
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[80px]" title={acc.name}>
                              {acc.name}
                            </span>
                          </div>
                          {getAccountIncome(acc.id) > 0 && (
                            <span className={`text-[10px] font-medium ${c.text}`}>
                              +N${getAccountIncome(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {getAccountExpenses(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-red-500">
                              −N${getAccountExpenses(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} spent
                            </span>
                          )}
                          {getAccountAllocated(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-orange-500">
                              −N${getAccountAllocated(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} budgeted
                            </span>
                          )}
                          {getAccountIncome(acc.id) > 0 && (
                            <span className={`text-[10px] font-bold border-t border-gray-200 dark:border-gray-600 pt-0.5 mt-0.5 ${total < 0 ? "text-red-600" : "text-gray-700 dark:text-gray-200"}`}>
                              N${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} left
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => confirmDeleteAccount(acc)}
                          className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                          title={`Remove ${acc.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {items.length > 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          {items.map((inc) => (
                            <IconCard
                              key={inc.id}
                              item={inc}
                              draggable
                              onDragStart={(e) => handleDragStart(e, inc)}
                              colorClass={c.text}
                              bgClass={`${c.bg} ${c.border}`}
                              hoverRing={`hover:${c.ring}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg min-h-[40px]">
                          <span className="text-[10px] text-gray-400 text-center px-1">Drop income here</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {accountsOfType.length === 0 && addingAccountType !== type && (
                  <div className="px-1">
                    <button
                      onClick={() => { setAddingAccountType(type); setNewAccountName(""); }}
                      className="w-full flex items-center justify-center gap-1 py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-[10px] text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add {label}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Flow hints */}
          <div className={`flex items-center justify-center gap-1 pt-2 transition-all duration-300 ${isDragging ? "opacity-100" : "opacity-40"}`}>
            <ArrowLeft className={`h-4 w-4 ${isDragging ? "text-[#2f6064] animate-pulse" : "text-gray-400"}`} />
            <span className={`text-[10px] font-medium ${isDragging ? "text-[#2f6064]" : "text-gray-400"}`}>
              {isDragging ? "Drop above" : "Drag here"}
            </span>
          </div>
          <div className="text-center px-1 pt-1">
            <p className="text-[9px] text-gray-400 leading-snug">
              Drag the <span className="font-semibold">⠿ handle</span> on an account →<br />drop on a planned expense
            </p>
          </div>
        </aside>

        {/* Right area: three rows */}
        <main className="col-span-10 space-y-6">
          {/* Row 1: Income — unallocated */}
          <div
            className={`bg-white dark:bg-gray-800 border rounded-lg p-6 transition-colors ${
              dragOverTarget === "unallocated"
                ? "border-[#2f6064] ring-2 ring-[#2f6064]/30"
                : "border-gray-200 dark:border-gray-700"
            }`}
            onDrop={handleDropOnUnallocated}
            onDragOver={(e) => { handleDragOver(e); setDragOverTarget("unallocated"); }}
            onDragLeave={() => setDragOverTarget(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2f6064]" />
                Income
                <span className="text-[10px] font-normal text-gray-400 flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> drag to accounts
                </span>
              </h3>
              {pooledIncome > 0 && (
                <span className="text-sm font-semibold text-[#2f6064]">
                  Total: N${pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            {unallocatedIncome.length > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                {unallocatedIncome.map((inc) => (
                  <IconCard
                    key={inc.id}
                    item={inc}
                    draggable
                    onDragStart={(e) => handleDragStart(e, inc)}
                  />
                ))}
                <div className="flex-1 min-w-[100px] h-20 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  <span className="text-xs text-gray-400 text-center px-2">Drop to un-assign</span>
                </div>
              </div>
            ) : allIncomeIcons.length > 0 ? (
              <div className="flex-1 min-w-[100px] h-20 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-xs text-gray-400 text-center px-2">All income allocated — drag items back here to un-assign</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No income items found from onboarding.</p>
            )}
          </div>

          {/* Row 3: Planned expenses — drop target for account allocations */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-600" />
                Planned expenses
              </h3>
              {pooledExpenses > 0 && (
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total: N${pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            {isDraggingAccount && (
              <p className="text-[11px] text-orange-500 font-medium mb-3 flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Drop on an expense to set your budget for it
              </p>
            )}
            {expenseIcons.length > 0 ? (
              <div className="flex flex-wrap items-start gap-4 mt-2">
                {expenseIcons.map((exp) => {
                  const allocated = getTotalAllocForExpense(exp.id);
                  const isDropOver = dragOverTarget === `exp-${exp.id}`;
                  return (
                    <div
                      key={exp.id}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                        isDropOver
                          ? "border-orange-400 ring-2 ring-orange-300 bg-orange-50 dark:bg-orange-900/20 scale-105"
                          : isDraggingAccount
                            ? "border-dashed border-orange-300 dark:border-orange-700 cursor-copy"
                            : "border-transparent"
                      }`}
                      onDrop={(e) => handleDropOnExpense(e, exp)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTarget(`exp-${exp.id}`); }}
                      onDragLeave={() => setDragOverTarget(null)}
                    >
                      <IconCard
                        item={exp}
                        colorClass="text-orange-600"
                        bgClass="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800"
                      />
                      {allocated > 0 && (
                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                          N${allocated.toLocaleString(undefined, { maximumFractionDigits: 0 })} budgeted
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No planned expense items found.</p>
            )}
          </div>

          {/* Row 4: This month overview */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">This month</h2>
              {isOverBudget ? <AlertCircle className="h-6 w-6 text-red-500" /> : <CheckCircle className="h-6 w-6 text-green-500" />}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Income (onboarding)</div>
                <div className="text-xl font-bold text-[#2f6064]">
                  N${pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Planned expenses (onboarding)</div>
                <div className="text-xl font-bold">
                  N${pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Spent this month</div>
                <div className={`text-xl font-bold ${totalExpenses > pooledExpenses ? "text-red-600 dark:text-red-400" : ""}`}>
                  N${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Remaining (vs 80% budget)</div>
                <div className={`text-xl font-bold ${remainingBudget < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  N${remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
              Delete account?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{deleteConfirm.name}</span>?
              All income allocations and expense budgets linked to this account will also be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Allocation modal ── */}
      {allocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Budget from {allocModal.accountName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              How much do you want to allocate from{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">{allocModal.accountName}</span>{" "}
              for{" "}
              <span className="font-semibold text-orange-600">{allocModal.expenseLabel}</span>?
            </p>

            <div className="relative mb-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">N$</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={allocAmount}
                onChange={(e) => setAllocAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveAllocation(); if (e.key === "Escape") { setAllocModal(null); setAllocAmount(""); } }}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {allocModal.existing > 0 && (
              <p className="text-xs text-gray-400 mb-4">
                Currently budgeted: N${allocModal.existing.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Enter 0 to remove.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSaveAllocation}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setAllocModal(null); setAllocAmount(""); }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
