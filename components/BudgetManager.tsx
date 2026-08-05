"use client";

import { useState, useEffect, useRef } from "react";
import { UserProfile, Income, RegistrationExpense } from "@/types";
import { storage } from "@/lib/storage";
import { computePooledIncome, computePooledExpenses } from "@/lib/budgetTotals";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Cap absurd client-submitted money values (defense in depth; DB has no upper bound). */
const MAX_MONEY_AMOUNT = 1_000_000_000;

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

type TransferModal =
  | {
      mode: "income_to_account";
      incomeId: string;
      incomeLabel: string;
      accountId: string;
      accountName: string;
      incomeTotal: number;
      previousUsed: number;
      /** Defined income minus already allocated; negative when over-allocated. */
      remaining: number;
    }
  | {
      mode: "account_to_account";
      fromAccountId: string;
      fromAccountName: string;
      toAccountId: string;
      toAccountName: string;
      existing: number;
    };

function parseMoneyInput(raw: string): number | null {
  const amount = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_MONEY_AMOUNT) return null;
  return Math.round(amount * 100) / 100;
}

function addToMapTotal(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

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
  Other: "wallet",
};

const INCOME_CATEGORIES = [
  "Salary",
  "Rental Income",
  "Bonus",
  "Side Hustle",
  "Board Fees",
  "Commission",
  "Business Income",
  "Pension",
  "Retirement Annuities",
  "Dividends",
  "Interest Income",
  "Sales of Goods",
  "Other income",
] as const;

const EXPENSE_CATEGORIES = [
  "Company Pension",
  "Tax",
  "Medical Aid",
  "Investments",
  "Retirement Annuity",
  "Long Term Insurance",
  "Short Term Insurance",
  "Funeral Insurance",
  "Bank Charges",
  "Personal Loan Payments",
  "Home Loan Payments",
  "Vehicle Loan Payments",
  "Credit Card Payments",
  "Rental Expenses",
  "Water & Electricity",
  "Rates and Taxes",
  "Groceries",
  "Dining Out",
  "Lunch",
  "Subscriptions",
  "Clothing Accounts",
  "Fuel & Transport Expenses",
  "Entertainment",
  "Domestic Staff Salary",
  "Garden Staff Salary",
  "Kids: School Fees",
  "Kids: After Care",
  "Kids: Extra Mural Activities",
  "Kids: Maintenance",
  "Maintenance: Car",
  "Maintenance: House",
  "Armed Response",
  "Internet/Data",
  "Airtime",
  "Family: Extended",
  "Farm Expenses",
  "Donations",
  "Legal Expense",
  "Educations",
  "Medicine",
  "Administration",
  "Vacations",
  "Other Expense",
] as const;

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
  colorClass = "text-[#2f6064]",
  bgClass = "bg-[#2f6064]/5 dark:bg-[#2f6064]/10 border-[#2f6064]/20",
  liveAmount,
  liveAmountLabel,
  liveAmountPrefix,
  liveAmountTone,
  selected,
  onClick,
}: {
  item: IconItem;
  onClick?: () => void;
  colorClass?: string;
  bgClass?: string;
  liveAmount?: number;
  liveAmountLabel?: string;
  liveAmountPrefix?: string;
  liveAmountTone?: "danger" | "success" | "neutral";
  selected?: boolean;
}) {
  const Icon = ICONS[item.key] || Wallet;
  const title =
    item.amount != null
      ? `${item.label}: R ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : item.label;

  const amountClass =
    liveAmountTone === "danger" || liveAmountPrefix === "−"
      ? "text-red-600 dark:text-red-400"
      : liveAmountTone === "success"
        ? "text-green-600 dark:text-green-400"
        : liveAmountTone === "neutral"
          ? "text-gray-700 dark:text-gray-300"
          : item.amount != null && liveAmount != null && liveAmount > item.amount
            ? "text-red-600 dark:text-red-400"
            : item.amount != null && liveAmount != null
              ? "text-green-600 dark:text-green-400"
              : "text-gray-900 dark:text-gray-100";

  return (
    <div
      onClick={onClick}
      className={`flex min-w-[76px] flex-none select-none flex-col items-center rounded-xl touch-manipulation sm:min-w-[88px] ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "ring-2 ring-[#2f6064]/50 ring-offset-2 ring-offset-white dark:ring-offset-gray-800" : ""}`}
      title={title}
    >
      <div className={`p-3 rounded-full border ${bgClass} transition-shadow`}>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
      {item.category && (
        <span className="mt-1 max-w-[92px] break-words text-center text-xs leading-tight text-gray-500 dark:text-gray-400 sm:max-w-[100px] sm:text-[14px]">
          {item.category}
        </span>
      )}
      {!item.category && (
        <span className="mt-1 max-w-[76px] truncate text-center text-xs text-gray-600 dark:text-gray-300 sm:max-w-[88px]">
          {item.label}
        </span>
      )}
      {item.amount != null && item.amount > 0 && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
          R {item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )}
      {liveAmount != null && (
        <span className={`text-[12px] font-semibold mt-0.5 ${amountClass}`}>
          {liveAmountLabel ? `${liveAmountLabel}: ` : ""}
          {liveAmountPrefix}R {liveAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

export default function BudgetManager() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
  // income transfer amount per income item id
  const [incomeTransferAmounts, setIncomeTransferAmounts] = useState<Map<string, number>>(new Map());
  // account-to-account flow amounts: key = `${fromAccountId}::${toAccountId}`
  const [accountTransfers, setAccountTransfers] = useState<Map<string, number>>(new Map());
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string | null>(null);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newAccountType, setNewAccountType] = useState("bank");
  const [newAccountName, setNewAccountName] = useState("");
  const [isAddingAccount, setIsAddingAccount] = useState(false);

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
  const [transferModal, setTransferModal] = useState<TransferModal | null>(null);
  const [transferAmount, setTransferAmount] = useState("");

  // Add Income modal state
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [newIncomeCategory, setNewIncomeCategory] = useState("Salary");
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");

  // Add Expense modal state
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [newExpenseCategory, setNewExpenseCategory] = useState("Groceries");
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const isAddingExpenseRef = useRef(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const isAddingIncomeRef = useRef(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [availableWalletBalance, setAvailableWalletBalance] = useState(0);
  const loadGeneration = useRef(0);

  const invalidateBudgetLoads = () => {
    loadGeneration.current += 1;
    storage.clearBudgetManagerCache();
  };

  async function loadData(options?: { bypassCache?: boolean; showLoading?: boolean }): Promise<boolean> {
    const generation = ++loadGeneration.current;
    const showLoading = options?.showLoading ?? true;
    if (showLoading) setIsLoading(true);
    try {
      const budgetData = await storage.getBudgetManagerData({
        bypassCache: options?.bypassCache,
        writeCache: !options?.bypassCache,
      });
      if (!budgetData || generation !== loadGeneration.current) {
        return false;
      }

      const {
        profile: loadedProfile,
        expenses,
        income: incomeList,
        budgetExpenses: budgetExpensesList,
        userAccounts: accounts,
        incomeAllocations,
        accountExpenseAllocations,
        accountTransfers,
        availableWalletBalance: walletBalance,
      } = budgetData;
      const userProfile = loadedProfile ?? await storage.getProfile();

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
      const incomeTransferMap = new Map<string, number>();
      for (const a of incomeAllocations) {
        const amount = Number(a.amount) || 0;
        if (amount > 0) {
          allocMap.set(a.incomeId, a.accountId);
          incomeTransferMap.set(a.incomeId, amount);
        }
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

      const byAccount = new Map<string, number>();
      for (const exp of thisMonthExpenses) {
        if (exp.accountId) {
          byAccount.set(exp.accountId, (byAccount.get(exp.accountId) ?? 0) + exp.amount);
        }
      }
      setMonthlyExpensesByAccount(byAccount);

      const expAllocMap = new Map<string, number>();
      for (const a of accountExpenseAllocations) {
        expAllocMap.set(`${a.accountId}::${a.expenseId}`, a.amount);
      }
      setExpenseAllocations(expAllocMap);

      setIncomeTransferAmounts(incomeTransferMap);

      const accountTransferMap = new Map<string, number>();
      for (const t of accountTransfers) {
        accountTransferMap.set(`${t.fromAccountId}::${t.toAccountId}`, t.amount);
      }
      setAccountTransfers(accountTransferMap);
      setAvailableWalletBalance(walletBalance);
      if (generation !== loadGeneration.current) return false;

      if (options?.bypassCache) {
        const { fromCache, ...cachePayload } = budgetData;
        void fromCache;
        void storage.persistBudgetManagerCache(cachePayload);
      }

      return Boolean(budgetData.fromCache);
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const usedCache = await loadData();
      if (usedCache) {
        void loadData({ bypassCache: true, showLoading: false });
      }
    });
  }, []);

  const clearTapSelection = () => {
    setSelectedIncomeId(null);
    setSelectedSourceAccountId(null);
  };

  const openExpenseAllocationModal = (accountId: string, expItem: IconItem): boolean => {
    const acc = userAccounts.find((a) => a.id === accountId);
    if (!acc) return false;

    const existing = expenseAllocations.get(`${acc.id}::${expItem.id}`) ?? 0;
    setAllocAmount(existing > 0 ? String(existing) : "");
    setAllocModal({
      accountId: acc.id,
      accountName: acc.name,
      expenseId: expItem.id,
      expenseLabel: expItem.name ?? expItem.category ?? expItem.label,
      existing,
    });
    return true;
  };

  const openIncomeTransferModal = (incomeId: string, accountId: string): boolean => {
    const incomeItem = allIncomeIcons.find((i) => i.id === incomeId);
    const targetAccount = userAccounts.find((a) => a.id === accountId);
    if (!incomeItem || !targetAccount || targetAccount.accountType === "wallet") return false;

    const incomeTotal = incomeItem.amount ?? 0;
    const previousUsed = incomeTransferAmounts.get(incomeId) ?? 0;
    const remaining = incomeTotal - previousUsed;

    // Suggest remaining when under-allocated; leave blank when already at/over so the user can add more.
    setTransferAmount(remaining > 0 ? String(remaining) : "");
    setTransferModal({
      mode: "income_to_account",
      incomeId,
      incomeLabel: incomeItem.category ?? incomeItem.label,
      accountId,
      accountName: targetAccount.name,
      incomeTotal,
      previousUsed,
      remaining,
    });
    return true;
  };

  const openAccountTransferModal = (sourceAccountId: string, accountId: string): boolean => {
    if (sourceAccountId === accountId) return false;

    const sourceAccount = userAccounts.find((a) => a.id === sourceAccountId);
    const targetAccount = userAccounts.find((a) => a.id === accountId);
    if (!sourceAccount || !targetAccount || sourceAccount.accountType === "wallet" || targetAccount.accountType === "wallet") return false;

    const existing = accountTransfers.get(`${sourceAccountId}::${accountId}`) ?? 0;
    setTransferAmount(existing > 0 ? String(existing) : "");
    setTransferModal({
      mode: "account_to_account",
      fromAccountId: sourceAccountId,
      fromAccountName: sourceAccount.name,
      toAccountId: accountId,
      toAccountName: targetAccount.name,
      existing,
    });
    return true;
  };

  const handleIncomeTap = (item: IconItem) => {
    setSelectedSourceAccountId(null);
    setSelectedIncomeId((current) => (current === item.id ? null : item.id));
  };

  const handleAccountTap = (acc: UserAccount) => {
    if (acc.accountType === "wallet") return;

    if (selectedIncomeId) {
      if (openIncomeTransferModal(selectedIncomeId, acc.id)) clearTapSelection();
      return;
    }

    if (selectedSourceAccountId && selectedSourceAccountId !== acc.id) {
      if (openAccountTransferModal(selectedSourceAccountId, acc.id)) clearTapSelection();
      return;
    }

    setSelectedIncomeId(null);
    setSelectedSourceAccountId((current) => (current === acc.id ? null : acc.id));
  };

  const handleExpenseTap = (expItem: IconItem) => {
    if (!selectedSourceAccountId) return;
    if (openExpenseAllocationModal(selectedSourceAccountId, expItem)) clearTapSelection();
  };

  const handleSaveAllocation = async () => {
    if (!allocModal) return;
    const amount = parseMoneyInput(allocAmount);
    if (amount === null) return;
    invalidateBudgetLoads();
    const currentModal = allocModal;
    // Close immediately for smoother UX; persist in background.
    setAllocModal(null);
    setAllocAmount("");
    try {
      if (amount === 0) {
        await storage.deleteAccountExpenseAllocation(currentModal.accountId, currentModal.expenseId);
        setExpenseAllocations((prev) => {
          const next = new Map(prev);
          next.delete(`${currentModal.accountId}::${currentModal.expenseId}`);
          return next;
        });
      } else {
        await storage.saveAccountExpenseAllocation(currentModal.accountId, currentModal.expenseId, amount);
        setExpenseAllocations((prev) =>
          new Map(prev).set(`${currentModal.accountId}::${currentModal.expenseId}`, amount)
        );
      }
      storage.logBudgetActivity();
    } catch (err) {
      console.error(err);
    }
  };

  const closeTransferModal = () => {
    setTransferModal(null);
    setTransferAmount("");
    clearTapSelection();
  };

  const handleSaveTransfer = async () => {
    if (!transferModal) return;
    const rawAmount = parseMoneyInput(transferAmount);
    if (rawAmount === null) return;
    const currentTransfer = transferModal;
    invalidateBudgetLoads();
    // Close immediately for smoother UX; persist in background.
    closeTransferModal();

    try {
      if (currentTransfer.mode === "income_to_account") {
        if (rawAmount === 0) {
          setAllocations((prev) => {
            const next = new Map(prev);
            next.delete(currentTransfer.incomeId);
            return next;
          });
          setIncomeTransferAmounts((prev) => {
            const next = new Map(prev);
            next.delete(currentTransfer.incomeId);
            return next;
          });
          await storage.removeIncomeAllocation(currentTransfer.incomeId);
        } else {
          // Allow allocating beyond defined income (overage shown in red on the income card).
          const newTotal = Math.round((currentTransfer.previousUsed + rawAmount) * 100) / 100;
          if (newTotal <= 0 || newTotal > MAX_MONEY_AMOUNT) return;

          setAllocations((prev) => new Map(prev).set(currentTransfer.incomeId, currentTransfer.accountId));
          setIncomeTransferAmounts((prev) => new Map(prev).set(currentTransfer.incomeId, newTotal));
          await storage.saveIncomeAllocation(currentTransfer.incomeId, currentTransfer.accountId, newTotal);
        }
      } else if (currentTransfer.mode === "account_to_account") {
        const amount = rawAmount;
        const key = `${currentTransfer.fromAccountId}::${currentTransfer.toAccountId}`;
        setAccountTransfers((prev) => {
          const next = new Map(prev);
          if (amount === 0) next.delete(key);
          else next.set(key, amount);
          return next;
        });
        if (amount === 0) {
          await storage.removeAccountTransferAmount(currentTransfer.fromAccountId, currentTransfer.toAccountId);
        } else {
          await storage.saveAccountTransferAmount(currentTransfer.fromAccountId, currentTransfer.toAccountId, amount);
        }
      }
      storage.logBudgetActivity();
    } catch (err) {
      console.error(err);
    }
  };

  const openAddAccount = (accountType?: string) => {
    setNewAccountType(accountType ?? "bank");
    setNewAccountName("");
    setAddAccountOpen(true);
  };

  const closeAddAccount = () => {
    setAddAccountOpen(false);
    setNewAccountType("bank");
    setNewAccountName("");
  };

  const handleAddAccount = async () => {
    const name = newAccountName.trim();
    if (!name || isAddingAccount) return;
    setIsAddingAccount(true);
    invalidateBudgetLoads();
    try {
      const id = await storage.createUserAccount(newAccountType, name);
      setUserAccounts((prev) => [...prev, { id, accountType: newAccountType, name, sortOrder: prev.length }]);
      closeAddAccount();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const confirmDeleteAccount = (acc: UserAccount) => {
    setDeleteConfirm({ id: acc.id, name: acc.name });
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) return;
    invalidateBudgetLoads();
    const accountId = deleteConfirm.id;

    // Snapshot before optimistic updates so cleanup uses a stable view of related rows.
    const affectedIncomeIds = Array.from(allocations.entries())
      .filter(([, accId]) => accId === accountId)
      .map(([incomeId]) => incomeId);
    const transferPairs = Array.from(accountTransfers.keys())
      .filter((key) => {
        const [fromId, toId] = key.split("::");
        return fromId === accountId || toId === accountId;
      })
      .map((key) => key.split("::") as [string, string]);

    try {
      await storage.deleteUserAccount(accountId);
      setUserAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setAllocations((prev) => {
        const next = new Map(prev);
        for (const incomeId of affectedIncomeIds) next.delete(incomeId);
        return next;
      });
      setIncomeTransferAmounts((prev) => {
        const next = new Map(prev);
        for (const incomeId of affectedIncomeIds) next.delete(incomeId);
        return next;
      });
      setExpenseAllocations((prev) => {
        const next = new Map(prev);
        for (const key of next.keys()) {
          if (key.startsWith(`${accountId}::`)) next.delete(key);
        }
        return next;
      });
      setAccountTransfers((prev) => {
        const next = new Map(prev);
        for (const [fromId, toId] of transferPairs) next.delete(`${fromId}::${toId}`);
        return next;
      });

      await Promise.all([
        ...affectedIncomeIds.map((incomeId) => storage.removeIncomeTransferAmount(incomeId)),
        ...transferPairs.map(([fromAccountId, toAccountId]) =>
          storage.removeAccountTransferAmount(fromAccountId, toAccountId)
        ),
      ]);
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirm(null);
  };

  const handleAddIncome = async () => {
    if (isAddingIncomeRef.current) return;

    const amount = parseMoneyInput(newIncomeAmount);
    if (!newIncomeName.trim() || amount === null || amount <= 0) return;

    isAddingIncomeRef.current = true;
    setIsAddingIncome(true);

    const category = (newIncomeCategory === "Other income" ? "Other" : newIncomeCategory) as import("@/types").IncomeCategory;
    const newItem: Income = {
      id: crypto.randomUUID(),
      category,
      type: "Fixed",
      name: newIncomeName.trim(),
      personal: amount,
      spouse: 0,
      points: 0,
      editable: true,
    };

    setAddIncomeOpen(false);
    setNewIncomeCategory("Salary");
    setNewIncomeName("");
    setNewIncomeAmount("");

    invalidateBudgetLoads();
    try {
      await storage.saveIncome([...onboardingIncome, newItem]);
      setOnboardingIncome((prev) => [...prev, newItem]);
      const iconItem: IconItem = {
        id: newItem.id,
        key: INCOME_ICON_MAP[newIncomeCategory] ?? INCOME_ICON_MAP[category] ?? "wallet",
        label: newItem.name,
        amount: newItem.personal,
        category: newItem.category,
        name: newItem.name,
      };
      setAllIncomeIcons((prev) => [...prev, iconItem]);
    } catch (err) {
      console.error(err);
    } finally {
      isAddingIncomeRef.current = false;
      setIsAddingIncome(false);
    }
  };

  const handleAddExpense = async () => {
    if (isAddingExpenseRef.current) return;

    const amount = parseMoneyInput(newExpenseAmount);
    if (!newExpenseName.trim() || amount === null || amount <= 0) return;

    isAddingExpenseRef.current = true;
    setIsAddingExpense(true);

    const category = (newExpenseCategory === "Other Expense" ? "Other" : newExpenseCategory) as import("@/types").ExpenseCategory;
    const newItem: RegistrationExpense = {
      id: crypto.randomUUID(),
      category,
      type: "Fixed",
      name: newExpenseName.trim(),
      personal: amount,
      spouse: 0,
      points: 0,
      editable: true,
    };

    setAddExpenseOpen(false);
    setNewExpenseCategory("Groceries");
    setNewExpenseName("");
    setNewExpenseAmount("");

    invalidateBudgetLoads();
    try {
      await storage.saveBudgetExpenses([...onboardingExpenses, newItem]);
      setOnboardingExpenses((prev) => [...prev, newItem]);
      const iconItem: IconItem = {
        id: newItem.id,
        key: "card",
        label: newItem.name,
        amount: newItem.personal,
        category: newItem.category,
        name: newItem.name,
      };
      setExpenseIcons((prev) => [...prev, iconItem]);
      // Counts as a budget activity → earns the daily "Log Today's Expenses" task.
      await storage.logBudgetActivity();
    } catch (err) {
      console.error(err);
    } finally {
      isAddingExpenseRef.current = false;
      setIsAddingExpense(false);
    }
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

  const pooledIncome = computePooledIncome(onboardingIncome, profile);
  const pooledExpenses = computePooledExpenses(onboardingExpenses, profile);

  // Precompute O(n) indexes once per render instead of rescanning Maps per account/expense.
  const accountsByType = new Map<string, UserAccount[]>();
  for (const acc of userAccounts) {
    const list = accountsByType.get(acc.accountType);
    if (list) list.push(acc);
    else accountsByType.set(acc.accountType, [acc]);
  }

  const incomeItemsByAccount = new Map<string, IconItem[]>();
  const incomeAmountByAccount = new Map<string, number>();
  let actualIncomeLeft = 0;
  for (const inc of allIncomeIcons) {
    const allocated = incomeTransferAmounts.get(inc.id) ?? 0;
    const defined = inc.amount ?? 0;
    actualIncomeLeft += Math.max(0, defined - allocated);

    const accountId = allocations.get(inc.id);
    if (!accountId || allocated <= 0) continue;
    const list = incomeItemsByAccount.get(accountId);
    if (list) list.push(inc);
    else incomeItemsByAccount.set(accountId, [inc]);
    addToMapTotal(incomeAmountByAccount, accountId, allocated);
  }

  const expenseAllocByAccount = new Map<string, number>();
  const expenseAllocByExpense = new Map<string, number>();
  for (const [key, amount] of expenseAllocations) {
    const sep = key.indexOf("::");
    if (sep < 0) continue;
    const accountId = key.slice(0, sep);
    const expenseId = key.slice(sep + 2);
    addToMapTotal(expenseAllocByAccount, accountId, amount);
    addToMapTotal(expenseAllocByExpense, expenseId, amount);
  }

  const transferOutByAccount = new Map<string, number>();
  const transferInByAccount = new Map<string, number>();
  for (const [key, amount] of accountTransfers) {
    const sep = key.indexOf("::");
    if (sep < 0) continue;
    addToMapTotal(transferOutByAccount, key.slice(0, sep), amount);
    addToMapTotal(transferInByAccount, key.slice(sep + 2), amount);
  }

  let totalExpenses = 0;
  for (const exp of expenseIcons) {
    totalExpenses += expenseAllocByExpense.get(exp.id) ?? 0;
  }
  const monthlyBalance = actualIncomeLeft - totalExpenses;
  const isOverBudget = monthlyBalance < 0;
  const selectedIncome = selectedIncomeId ? allIncomeIcons.find((item) => item.id === selectedIncomeId) : null;
  const selectedSourceAccount = selectedSourceAccountId
    ? userAccounts.find((account) => account.id === selectedSourceAccountId)
    : null;
  const monthLabel = new Date().toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#2f6064]/10 p-3">
              <Wallet className="h-6 w-6 text-[#2f6064]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Budget</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tracking your spending</p>
            </div>
          </div>
          <div className="text-sm text-gray-500 sm:text-right">
            {monthLabel}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:gap-6">
        {/* Left vertical bar — accounts grouped by type */}
        <aside className="flex flex-col items-stretch space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 xl:col-span-3 xl:border-0 xl:bg-transparent xl:p-0 xl:py-6 2xl:col-span-2">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Cash and Liquid Investments</div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Add bank, savings, investment, or cash accounts, then tap to allocate income and expenses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAddAccount()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2f6064] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#255055]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Account
            </button>
          </div>

          {ACCOUNT_TYPE_META.map(({ type, label, icon: TypeIcon, color }) => {
            const c = COLOR_MAP[color];
            const accountsOfType = accountsByType.get(type) ?? [];
            const isWalletType = type === "wallet";
            const hideIncomeItems = type === "bank";

            return (
              <div key={type} className="w-full space-y-2">
                {/* Type header */}
                <div className="flex items-center gap-1.5 px-1">
                  <TypeIcon className={`h-4 w-4 ${c.text}`} />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                  {!isWalletType && accountsOfType.length > 0 && (
                    <span className="text-[10px] text-gray-400">({accountsOfType.length})</span>
                  )}
                </div>

                {/* Wallet: read-only available balance */}
                {isWalletType ? (
                  <div
                    className={`w-full rounded-xl border-2 p-3 border-gray-200 dark:border-gray-700 ${c.bg}`}
                    title="My 1-Wallet available balance from rewards"
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">My 1-Wallet</span>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Available balance</span>
                      <span className={`text-sm font-bold ${c.text}`}>
                        R {availableWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Individual accounts */}
                {accountsOfType.map((acc) => {
                  const items = incomeItemsByAccount.get(acc.id) ?? [];
                  const accountIncome = incomeAmountByAccount.get(acc.id) ?? 0;
                  const transferIn = transferInByAccount.get(acc.id) ?? 0;
                  const transferOut = transferOutByAccount.get(acc.id) ?? 0;
                  const accountExpenses = monthlyExpensesByAccount.get(acc.id) ?? 0;
                  const accountAllocated = expenseAllocByAccount.get(acc.id) ?? 0;
                  const total = accountIncome + transferIn - transferOut - accountExpenses - accountAllocated;
                  const isSelectedSource = selectedSourceAccountId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleAccountTap(acc)}
                      className={`w-full rounded-xl border-2 p-3 transition-all cursor-pointer select-none touch-manipulation ${
                        isSelectedSource
                          ? `${c.border} ${c.ring} ring-2 scale-[1.01]`
                          : selectedIncomeId
                            ? `border-gray-300 dark:border-gray-600 ${c.ring}/30 ring-1`
                            : `border-gray-200 dark:border-gray-700 hover:${c.border} hover:shadow-sm`
                      }`}
                      title={selectedIncomeId ? `Tap to transfer selected income to ${acc.name}` : `Tap this card to allocate budget from ${acc.name}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[100px]" title={acc.name}>
                              {acc.name}
                            </span>
                          </div>
                          {accountIncome > 0 && (
                            <span className={`text-[10px] font-medium ${c.text}`}>
                              +R {accountIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {transferIn > 0 && (
                            <span className="text-[10px] font-medium text-emerald-600">
                              +R {transferIn.toLocaleString(undefined, { maximumFractionDigits: 0 })} transfer in
                            </span>
                          )}
                          {transferOut > 0 && (
                            <span className="text-[10px] font-medium text-amber-600">
                              −R {transferOut.toLocaleString(undefined, { maximumFractionDigits: 0 })} transfer out
                            </span>
                          )}
                          {accountExpenses > 0 && (
                            <span className="text-[10px] font-medium text-red-500">
                              −R {accountExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })} spent
                            </span>
                          )}
                          {accountAllocated > 0 && (
                            <span className="text-[10px] font-medium text-orange-500">
                              −R {accountAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {(accountIncome > 0 || transferIn > 0 || accountAllocated > 0 || accountExpenses > 0 || transferOut > 0) && !hideIncomeItems && (
                            <span className={`text-[10px] font-bold border-t border-gray-200 dark:border-gray-600 pt-0.5 mt-0.5 ${total < 0 ? "text-red-600" : "text-gray-700 dark:text-gray-200"}`}>
                              R {total.toLocaleString(undefined, { maximumFractionDigits: 0 })} left
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); confirmDeleteAccount(acc); }}
                          className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                          title={`Remove ${acc.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {hideIncomeItems ? (
                        <div className={`rounded-lg border px-2 py-1.5 text-center ${c.bg} ${c.border}`}>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight block">
                            Income in
                          </span>
                          {accountIncome > 0 && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">
                              R {accountIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          <span
                            className={`text-[12px] font-semibold block ${
                              total < 0
                                ? "text-red-600 dark:text-red-400"
                                : total === 0
                                  ? "text-gray-400 dark:text-gray-500"
                                  : c.text
                            }`}
                          >
                            Left: R {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ) : items.length > 0 ? (
                        <div className="flex flex-col items-stretch gap-1.5 w-full">
                          {items.map((inc) => {
                            const allocatedAmount = incomeTransferAmounts.get(inc.id) ?? 0;
                            return (
                              <div
                                key={inc.id}
                                className={`rounded-lg border px-2 py-1.5 text-center ${c.bg} ${c.border}`}
                                title={`${inc.category ?? inc.label}: R ${allocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              >
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight block truncate">
                                  {inc.category ?? inc.label}
                                </span>
                                <span className={`text-[12px] font-semibold ${c.text}`}>
                                  +R {allocatedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            );
                          })}
                          <div className={`rounded-lg border px-2 py-1.5 text-center ${c.bg} ${c.border}`}>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight block">
                              Remaining
                            </span>
                            <span
                              className={`text-[12px] font-semibold block ${
                                total < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : total === 0
                                    ? "text-gray-400 dark:text-gray-500"
                                    : c.text
                              }`}
                            >
                              Left: R {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg min-h-[40px]">
                          <span className="text-[10px] text-gray-400 text-center px-1">
                            {selectedIncomeId ? "Tap to add income" : "Tap income, then here"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {accountsOfType.length === 0 && (
                  <button
                    type="button"
                    onClick={() => openAddAccount(type)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed ${c.border} ${c.bg} text-xs font-medium ${c.text} hover:opacity-90 transition-opacity`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add {label} account
                  </button>
                )}
                  </>
                )}
              </div>
            );
          })}

          {/* Flow hints */}
          <div className="hidden w-full rounded-lg px-2 py-2 text-center opacity-50 xl:block">
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-snug">
              <span className="font-semibold">Tap an account</span>
              <br />
              → then tap an expense to budget it
            </p>
          </div>
        </aside>

        {/* Right area: three rows */}
        <main className="space-y-5 xl:col-span-9 xl:space-y-6 2xl:col-span-10">
          {/* Row 1: Income — unallocated */}
          <div
            className="rounded-lg border border-gray-200 bg-white p-4 transition-colors dark:border-gray-700 dark:bg-gray-800 sm:p-6"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-md flex flex-wrap items-center gap-2 font-semibold">
                <TrendingUp className="h-5 w-5 text-[#2f6064]" />
                Income
                <span className="hidden text-[10px] font-normal text-gray-400 sm:inline">
                  tap, then select an account
                </span>
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {pooledIncome > 0 && (
                  <span className="text-sm font-semibold text-[#2f6064]">
                    Total: R {pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                <button
                  onClick={() => setAddIncomeOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2f6064] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#255055] sm:w-auto sm:py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Income
                </button>
              </div>
            </div>
            {selectedIncome && (
              <p className="mb-3 rounded-lg bg-[#2f6064]/10 px-3 py-2 text-xs font-medium text-[#2f6064] dark:text-[#7bb9bd]">
                {selectedIncome.category ?? selectedIncome.label} selected. Tap a bank, savings, investment, or cash account to transfer income.
              </p>
            )}
            {allIncomeIcons.length > 0 ? (
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:items-center sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
                {allIncomeIcons.map((inc) => {
                  const allocated = incomeTransferAmounts.get(inc.id) ?? 0;
                  return (
                    <IconCard
                      key={inc.id}
                      item={inc}
                      onClick={() => handleIncomeTap(inc)}
                      selected={selectedIncomeId === inc.id}
                      liveAmount={allocated}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No income items found from onboarding.</p>
            )}
          </div>

          {/* Row 3: Planned expenses */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-md flex items-center gap-2 font-semibold">
                <Receipt className="h-5 w-5 text-orange-600" />
                Expenses
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {pooledExpenses > 0 && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total: R {pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                <button
                  onClick={() => setAddExpenseOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 sm:w-auto sm:py-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Expense
                </button>
              </div>
            </div>
            {selectedSourceAccount && (
              <p className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-300">
                {selectedSourceAccount.name} selected. Tap an expense to budget from this account, or tap another account to transfer between accounts.
              </p>
            )}
            {expenseIcons.length > 0 ? (
              <div className="-mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:items-start sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
                {expenseIcons.map((exp) => {
                  const allocated = expenseAllocByExpense.get(exp.id) ?? 0;
                  return (
                    <div
                      key={exp.id}
                      className={`relative flex w-[104px] flex-none snap-start flex-col items-center gap-1 rounded-xl border-2 transition-all duration-150 sm:w-auto ${
                        selectedSourceAccountId
                          ? "border-dashed border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10 cursor-pointer p-3 min-w-[96px] min-h-[100px] justify-center"
                          : "border-transparent p-2"
                      }`}
                      onClick={selectedSourceAccountId ? () => handleExpenseTap(exp) : undefined}
                    >
                      {selectedSourceAccountId && (
                        <span className="absolute top-1 right-1.5 text-[9px] font-semibold text-orange-400">
                          tap here
                        </span>
                      )}
                      <IconCard
                        item={exp}
                        colorClass="text-orange-600"
                        bgClass="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800"
                        liveAmount={allocated}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No planned expense items found.</p>
            )}
          </div>

          {/* Row 4: This month overview */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">This month</h2>
              {isOverBudget ? <AlertCircle className="h-6 w-6 text-red-500" /> : <CheckCircle className="h-6 w-6 text-green-500" />}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
              <div className="rounded bg-gray-50 p-4 dark:bg-gray-900/20">
                <div className="text-sm text-gray-500">Income</div>
                <div className="break-words text-lg font-bold text-[#2f6064] sm:text-xl">
                  R {actualIncomeLeft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded bg-gray-50 p-4 dark:bg-gray-900/20">
                <div className="text-sm text-gray-500">Expenses</div>
                <div className="break-words text-lg font-bold sm:text-xl">
                  R {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded bg-gray-50 p-4 dark:bg-gray-900/20">
                <div className="text-sm text-gray-500">Balance</div>
                <div className={`break-words text-lg font-bold sm:text-xl ${monthlyBalance < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  R {monthlyBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* ── Add Account modal ── */}
      {addAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Add Account
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Choose a type and give your account a name.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Account type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPE_META.filter((t) => t.type !== "wallet").map(({ type, label, icon: TypeIcon, color }) => {
                  const c = COLOR_MAP[color];
                  const selected = newAccountType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAccountType(type)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                        selected
                          ? `${c.border} ${c.bg} ${c.ring} ring-2`
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <TypeIcon className={`h-4 w-4 shrink-0 ${c.text}`} />
                      <span className={`text-xs font-semibold ${selected ? c.text : "text-gray-700 dark:text-gray-300"}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Account name
              </label>
              <input
                autoFocus
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddAccount();
                  if (e.key === "Escape") closeAddAccount();
                }}
                placeholder={
                  newAccountType === "bank"
                    ? "e.g. FNB Cheque"
                    : newAccountType === "savings"
                      ? "e.g. Emergency Fund"
                      : newAccountType === "investment"
                        ? "e.g. Unit Trust"
                        : "e.g. Petty Cash"
                }
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddAccount}
                disabled={isAddingAccount || !newAccountName.trim()}
                className="flex-1 py-2.5 bg-[#2f6064] hover:bg-[#255055] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                {isAddingAccount ? "Adding..." : "Add Account"}
              </button>
              <button
                type="button"
                onClick={closeAddAccount}
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">R</span>
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
                Currently budgeted: R {allocModal.existing.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Enter 0 to remove.
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

      {/* ── Add Expense modal ── */}
      {addExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Add Expense
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Add a new planned expense to your budget.
            </p>

            {/* Expense category */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Expense
              </label>
              <select
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Name
              </label>
              <input
                autoFocus
                type="text"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddExpense(); if (e.key === "Escape") setAddExpenseOpen(false); }}
                placeholder="e.g. Monthly Groceries"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Monthly Budget Amount */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Monthly Budget Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">R</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddExpense(); if (e.key === "Escape") setAddExpenseOpen(false); }}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddExpense}
                disabled={isAddingExpense || !newExpenseName.trim() || !newExpenseAmount || Number(newExpenseAmount) <= 0}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                {isAddingExpense ? "Adding..." : "Add"}
              </button>
              <button
                onClick={() => { setAddExpenseOpen(false); setNewExpenseCategory("Groceries"); setNewExpenseName(""); setNewExpenseAmount(""); }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Income modal ── */}
      {addIncomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Add Income
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Add a new income source to your budget.
            </p>

            {/* Income category */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Income
              </label>
              <select
                value={newIncomeCategory}
                onChange={(e) => setNewIncomeCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
              >
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Name
              </label>
              <input
                autoFocus
                type="text"
                value={newIncomeName}
                onChange={(e) => setNewIncomeName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddIncome(); if (e.key === "Escape") { setAddIncomeOpen(false); } }}
                placeholder="e.g. Primary Salary"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
              />
            </div>

            {/* Monthly Budget Amount */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Monthly Budget Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">R</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newIncomeAmount}
                  onChange={(e) => setNewIncomeAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddIncome(); if (e.key === "Escape") { setAddIncomeOpen(false); } }}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddIncome}
                disabled={isAddingIncome || !newIncomeName.trim() || !newIncomeAmount || Number(newIncomeAmount) <= 0}
                className="flex-1 py-2.5 bg-[#2f6064] hover:bg-[#255055] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                {isAddingIncome ? "Adding..." : "Add"}
              </button>
              <button
                onClick={() => { setAddIncomeOpen(false); setNewIncomeCategory("Salary"); setNewIncomeName(""); setNewIncomeAmount(""); }}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer modal (Income→Account / Account→Account) ── */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {transferModal.mode === "income_to_account" ? "Transfer to account" : "Transfer between accounts"}
            </h2>
            {transferModal.mode === "income_to_account" ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Enter amount to transfer from{" "}
                <span className="font-semibold text-[#2f6064]">{transferModal.incomeLabel}</span>{" "}
                to{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{transferModal.accountName}</span>.
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Enter amount to transfer from{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{transferModal.fromAccountName}</span>{" "}
                to{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{transferModal.toAccountName}</span>.
              </p>
            )}

            <div className="relative mb-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">R</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTransfer(); if (e.key === "Escape") closeTransferModal(); }}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
              />
            </div>

            {transferModal.mode === "income_to_account" && (
              <p className={`text-xs mb-4 ${transferModal.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                Defined income: R {transferModal.incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                {" "}Already allocated: R {transferModal.previousUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                {transferModal.remaining < 0 ? (
                  <>
                    {" "}Over by: R {Math.abs(transferModal.remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                    {" "}You can allocate more. Enter 0 to remove.
                  </>
                ) : (
                  <>
                    {" "}Left: R {transferModal.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                    {" "}Enter how much to add to this account (over-allocation is allowed). Enter 0 to remove.
                  </>
                )}
              </p>
            )}

            {transferModal.mode === "account_to_account" && transferModal.existing > 0 && (
              <p className="text-xs text-gray-400 mb-4">
                Current flow amount: R {transferModal.existing.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Enter 0 to remove.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSaveTransfer}
                className="flex-1 py-2.5 bg-[#2f6064] hover:bg-[#255055] text-white font-semibold rounded-xl transition-colors"
              >
                Save
              </button>
              <button
                onClick={closeTransferModal}
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
