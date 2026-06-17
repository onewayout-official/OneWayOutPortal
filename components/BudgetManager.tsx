"use client";

import { useState, useEffect } from "react";
import { UserProfile, Income, RegistrationExpense } from "@/types";
import { storage } from "@/lib/storage";
import { computePooledIncome, computePooledExpenses } from "@/lib/budgetTotals";
import { rewards } from "@/lib/gamification/rewards";
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

type TransferModal =
  | {
      mode: "income_to_account";
      incomeId: string;
      incomeLabel: string;
      accountId: string;
      accountName: string;
      existing: number;
    }
  | {
      mode: "account_to_account";
      fromAccountId: string;
      fromAccountName: string;
      toAccountId: string;
      toAccountName: string;
      existing: number;
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
  draggable,
  onDragStart,
  colorClass = "text-[#2f6064]",
  bgClass = "bg-[#2f6064]/5 dark:bg-[#2f6064]/10 border-[#2f6064]/20",
  hoverRing = "hover:ring-[#2f6064]/40",
  liveAmount,
  liveAmountLabel,
}: {
  item: IconItem;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  colorClass?: string;
  bgClass?: string;
  hoverRing?: string;
  liveAmount?: number;
  liveAmountLabel?: string;
}) {
  const Icon = ICONS[item.key] || Wallet;
  const title =
    item.amount != null
      ? `${item.label}: R${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : item.label;

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
        <span className="text-[14px] mt-1 text-gray-500 dark:text-gray-400 text-center max-w-[100px] leading-tight break-words whitespace-normal">
          {item.category}
        </span>
      )}
      {!item.category && (
        <span className="text-xs mt-1 text-gray-600 dark:text-gray-300 text-center max-w-[88px] truncate">
          {item.label}
        </span>
      )}
      {item.amount != null && item.amount > 0 && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
          R{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      )}
      {liveAmount != null && (
        <span
          className={`text-[12px] font-semibold mt-0.5 ${
            liveAmountLabel === "Left"
              ? liveAmount === 0
                ? "text-gray-400 dark:text-gray-500"
                : "text-[#2f6064] dark:text-[#5a9ea3]"
              : item.amount != null
                ? liveAmount > item.amount
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
                : "text-gray-900 dark:text-gray-100"
          }`}
        >
          {liveAmountLabel ? `${liveAmountLabel}: ` : ""}
          R{liveAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
  // income transfer amount per income item id
  const [incomeTransferAmounts, setIncomeTransferAmounts] = useState<Map<string, number>>(new Map());
  // account-to-account flow amounts: key = `${fromAccountId}::${toAccountId}`
  const [accountTransfers, setAccountTransfers] = useState<Map<string, number>>(new Map());
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
  const [availableWalletBalance, setAvailableWalletBalance] = useState(0);

  useEffect(() => {
    loadData();
    storage.logBudgetActivity();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userProfile, expenses, incomeList, budgetExpensesList, accounts, savedAllocations, expenseAllocs, budgetFlowState, walletBalance] =
        await Promise.all([
          storage.getProfile(),
          storage.getExpenses(),
          storage.getIncome(),
          storage.getBudgetExpenses(),
          storage.getUserAccounts(),
          storage.getIncomeAllocations(),
          storage.getAccountExpenseAllocations(),
          storage.getBudgetFlowState(),
          rewards.getAvailableWalletBalance(),
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

      const incomeTransferMap = new Map<string, number>();
      for (const t of budgetFlowState.incomeTransferAmounts) {
        incomeTransferMap.set(t.incomeId, t.amount);
      }
      setIncomeTransferAmounts(incomeTransferMap);

      const accountTransferMap = new Map<string, number>();
      for (const t of budgetFlowState.accountTransfers) {
        accountTransferMap.set(`${t.fromAccountId}::${t.toAccountId}`, t.amount);
      }
      setAccountTransfers(accountTransferMap);
      setAvailableWalletBalance(walletBalance);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const getAllocatedAmount = (incomeId: string): number =>
    allocations.has(incomeId) ? (incomeTransferAmounts.get(incomeId) ?? 0) : 0;

  const getRemainingIncome = (item: IconItem): number =>
    Math.max(0, (item.amount ?? 0) - getAllocatedAmount(item.id));

  const getItemsForAccount = (accountId: string): IconItem[] =>
    allIncomeIcons.filter((i) => allocations.get(i.id) === accountId);

  const getIncomeAmountForAccount = (item: IconItem): number =>
    incomeTransferAmounts.get(item.id) ?? (item.amount ?? 0);

  const getAccountIncome = (accountId: string): number =>
    getItemsForAccount(accountId).reduce((sum, i) => sum + getIncomeAmountForAccount(i), 0);

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
    getAccountIncome(accountId) + getAccountTransferIn(accountId) - getAccountTransferOut(accountId) - getAccountExpenses(accountId) - getAccountAllocated(accountId);

  const getAccountTransferOut = (accountId: string): number => {
    let total = 0;
    for (const [key, amount] of accountTransfers) {
      if (key.startsWith(`${accountId}::`)) total += amount;
    }
    return total;
  };

  const getAccountTransferIn = (accountId: string): number => {
    let total = 0;
    for (const [key, amount] of accountTransfers) {
      if (key.endsWith(`::${accountId}`)) total += amount;
    }
    return total;
  };

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
    e.dataTransfer.setData("application/income-id", item.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    const onEnd = () => { setIsDragging(false); document.removeEventListener("dragend", onEnd); };
    document.addEventListener("dragend", onEnd);
  };

  const handleAccountDragStart = (e: React.DragEvent, acc: UserAccount) => {
    e.dataTransfer.setData("application/account-id", acc.id);
    e.dataTransfer.effectAllowed = "copy";
    setIsDraggingAccount(true);
    const onEnd = () => { setIsDraggingAccount(false); document.removeEventListener("dragend", onEnd); };
    document.addEventListener("dragend", onEnd);
  };

  const handleDropOnExpense = (e: React.DragEvent, expItem: IconItem) => {
    e.preventDefault();
    setDragOverTarget(null);
    const raw = e.dataTransfer.getData("application/account-id");
    if (!raw) return;
    try {
      const accountId = raw;
      const acc = userAccounts.find((a) => a.id === accountId);
      if (!acc) return;
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
    const amount = Number(allocAmount.replace(/,/g, "").trim());
    if (isNaN(amount) || amount < 0) return;
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

  const handleDropOnAccount = async (e: React.DragEvent, accountId: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    const incomeId = e.dataTransfer.getData("application/income-id");
    if (incomeId) {
      const incomeItem = allIncomeIcons.find((i) => i.id === incomeId);
      const targetAccount = userAccounts.find((a) => a.id === accountId);
      if (!incomeItem || !targetAccount || targetAccount.accountType === "wallet") return;
      const existing =
        allocations.get(incomeId) === accountId
          ? (incomeTransferAmounts.get(incomeId) ?? incomeItem.amount ?? 0)
          : 0;
      setTransferAmount(existing > 0 ? String(existing) : String(incomeItem.amount ?? ""));
      setTransferModal({
        mode: "income_to_account",
        incomeId,
        incomeLabel: incomeItem.category ?? incomeItem.label,
        accountId,
        accountName: targetAccount.name,
        existing,
      });
      return;
    }

    const sourceAccountId = e.dataTransfer.getData("application/account-id");
    if (sourceAccountId && sourceAccountId !== accountId) {
      const sourceAccount = userAccounts.find((a) => a.id === sourceAccountId);
      const targetAccount = userAccounts.find((a) => a.id === accountId);
      if (!sourceAccount || !targetAccount || sourceAccount.accountType === "wallet" || targetAccount.accountType === "wallet") return;
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
      return;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSaveTransfer = async () => {
    if (!transferModal) return;
    const amount = Number(transferAmount.replace(/,/g, "").trim());
    if (isNaN(amount) || amount < 0) return;
    const currentTransfer = transferModal;
    // Close immediately for smoother UX; persist in background.
    setTransferModal(null);
    setTransferAmount("");

    try {
      if (currentTransfer.mode === "income_to_account") {
        if (amount === 0) {
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
          await storage.removeIncomeTransferAmount(currentTransfer.incomeId);
        } else {
          setAllocations((prev) => new Map(prev).set(currentTransfer.incomeId, currentTransfer.accountId));
          setIncomeTransferAmounts((prev) => new Map(prev).set(currentTransfer.incomeId, amount));
          await storage.saveIncomeAllocation(currentTransfer.incomeId, currentTransfer.accountId);
          await storage.saveIncomeTransferAmount(currentTransfer.incomeId, amount);
        }
      } else if (currentTransfer.mode === "account_to_account") {
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
      setAccountTransfers((prev) => {
        const next = new Map(prev);
        for (const key of next.keys()) {
          if (key.startsWith(`${accountId}::`) || key.endsWith(`::${accountId}`)) next.delete(key);
        }
        return next;
      });
      setIncomeTransferAmounts((prev) => {
        const next = new Map(prev);
        for (const [incomeId, accId] of allocations.entries()) {
          if (accId === accountId) next.delete(incomeId);
        }
        return next;
      });

      const affectedIncomeIds = Array.from(allocations.entries())
        .filter(([, accId]) => accId === accountId)
        .map(([incomeId]) => incomeId);
      await Promise.all(affectedIncomeIds.map((incomeId) => storage.removeIncomeTransferAmount(incomeId)));

      const transferPairs = Array.from(accountTransfers.keys())
        .filter((key) => key.startsWith(`${accountId}::`) || key.endsWith(`::${accountId}`))
        .map((key) => key.split("::") as [string, string]);
      await Promise.all(
        transferPairs.map(([fromAccountId, toAccountId]) =>
          storage.removeAccountTransferAmount(fromAccountId, toAccountId)
        )
      );
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirm(null);
  };

  const handleAddIncome = async () => {
    const amount = Number(newIncomeAmount.replace(/,/g, "").trim());
    if (!newIncomeName.trim() || isNaN(amount) || amount <= 0) return;

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
    }

    setAddIncomeOpen(false);
    setNewIncomeCategory("Salary");
    setNewIncomeName("");
    setNewIncomeAmount("");
  };

  const handleAddExpense = async () => {
    const amount = Number(newExpenseAmount.replace(/,/g, "").trim());
    if (!newExpenseName.trim() || isNaN(amount) || amount <= 0) return;

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
    } catch (err) {
      console.error(err);
    }

    setAddExpenseOpen(false);
    setNewExpenseCategory("Groceries");
    setNewExpenseName("");
    setNewExpenseAmount("");
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

  const monthlyIncome = pooledIncome;
  const budgetTarget = monthlyIncome * 0.8;
  const remainingBudget = budgetTarget - totalExpenses;
  const isOverBudget = totalExpenses > budgetTarget;
  const plannedBalance = pooledExpenses - totalExpenses;

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
              <p className="text-sm text-gray-600 dark:text-gray-400">Tracking your spending</p>
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
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Cash and Liquid Investments</div>

          {ACCOUNT_TYPE_META.map(({ type, label, icon: TypeIcon, color }) => {
            const c = COLOR_MAP[color];
            const accountsOfType = userAccounts.filter((a) => a.accountType === type);
            const isWalletType = type === "wallet";

            return (
              <div key={type} className="w-full space-y-2">
                {/* Type header with add button */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className={`h-4 w-4 ${c.text}`} />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                  </div>
                  {!isWalletType && (
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
                  )}
                </div>

                {/* Wallet: read-only available balance (no drag and drop) */}
                {isWalletType ? (
                  <div
                    className={`w-full rounded-xl border-2 p-3 border-gray-200 dark:border-gray-700 ${c.bg}`}
                    title="My 1-Wallet available balance from rewards"
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">My 1-Wallet</span>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Available balance</span>
                      <span className={`text-sm font-bold ${c.text}`}>
                        R{availableWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
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
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); handleAccountDragStart(e, acc); }}
                      className={`w-full rounded-xl border-2 p-3 transition-all cursor-grab active:cursor-grabbing select-none ${
                        isOver
                          ? `${c.border} ${c.ring} ring-2 scale-[1.02]`
                          : isDragging || isDraggingAccount
                            ? `border-gray-300 dark:border-gray-600 ${c.ring}/30 ring-1 animate-pulse`
                            : `border-gray-200 dark:border-gray-700 hover:${c.border} hover:shadow-sm`
                      }`}
                      title={`Drag this card to a planned expense to allocate budget from ${acc.name}`}
                      onDrop={(e) => handleDropOnAccount(e, acc.id)}
                      onDragOver={(e) => { handleDragOver(e); setDragOverTarget(acc.id); }}
                      onDragLeave={() => setDragOverTarget(null)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="flex items-center gap-1">
                            <GripVertical className={`h-3.5 w-3.5 ${c.text} opacity-60 flex-shrink-0`} />
                            <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[80px]" title={acc.name}>
                              {acc.name}
                            </span>
                          </div>
                          {getAccountIncome(acc.id) > 0 && (
                            <span className={`text-[10px] font-medium ${c.text}`}>
                              +R{getAccountIncome(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {getAccountTransferIn(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-emerald-600">
                              +R{getAccountTransferIn(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} transfer in
                            </span>
                          )}
                          {getAccountTransferOut(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-amber-600">
                              −R{getAccountTransferOut(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} transfer out
                            </span>
                          )}
                          {getAccountExpenses(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-red-500">
                              −R{getAccountExpenses(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} spent
                            </span>
                          )}
                          {getAccountAllocated(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-orange-500">
                              −R{getAccountAllocated(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} 
                            </span>
                          )}
                          {getAccountIncome(acc.id) > 0 && (
                            <span className={`text-[10px] font-bold border-t border-gray-200 dark:border-gray-600 pt-0.5 mt-0.5 ${total < 0 ? "text-red-600" : "text-gray-700 dark:text-gray-200"}`}>
                              R{total.toLocaleString(undefined, { maximumFractionDigits: 0 })} left
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
                        <div className="flex flex-col items-stretch gap-1.5 w-full">
                          {items.map((inc) => (
                            <div
                              key={inc.id}
                              className={`rounded-lg border px-2 py-1.5 text-center ${c.bg} ${c.border}`}
                              title={`${inc.category ?? inc.label}: R${getIncomeAmountForAccount(inc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            >
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight block truncate">
                                {inc.category ?? inc.label}
                              </span>
                              <span className={`text-[12px] font-semibold ${c.text}`}>
                                +R{getIncomeAmountForAccount(inc).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
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
                  </>
                )}
              </div>
            );
          })}

          {/* Flow hints */}
          <div className={`w-full rounded-lg px-2 py-2 text-center transition-all duration-300 ${isDraggingAccount ? "bg-[#2f6064]/10 opacity-100" : "opacity-50"}`}>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-snug">
              {isDraggingAccount
                ? <span className="font-semibold text-[#2f6064]">Drop on an expense →</span>
                : <><span className="font-semibold">Drag any account card</span><br />→ drop on an expense to budget it</>
              }
            </p>
          </div>
        </aside>

        {/* Right area: three rows */}
        <main className="col-span-10 space-y-6">
          {/* Row 1: Income — unallocated */}
          <div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#2f6064]" />
                Income
                <span className="text-[10px] font-normal text-gray-400 flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> drag to accounts
                </span>
              </h3>
              <div className="flex items-center gap-3">
                {pooledIncome > 0 && (
                  <span className="text-sm font-semibold text-[#2f6064]">
                    Total: R{pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                <button
                  onClick={() => setAddIncomeOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2f6064] hover:bg-[#255055] rounded-lg transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Income
                </button>
              </div>
            </div>
            {allIncomeIcons.length > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                {allIncomeIcons.map((inc) => {
                  const allocated = getAllocatedAmount(inc.id);
                  const remaining = getRemainingIncome(inc);
                  return (
                    <IconCard
                      key={inc.id}
                      item={inc}
                      draggable
                      onDragStart={(e) => handleDragStart(e, inc)}
                      liveAmount={allocated > 0 ? remaining : undefined}
                      liveAmountLabel={allocated > 0 ? "Left" : undefined}
                    />
                  );
                })}
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
                Expenses
              </h3>
              <div className="flex items-center gap-3">
                {pooledExpenses > 0 && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total: R{pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
                <button
                  onClick={() => setAddExpenseOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Expense
                </button>
              </div>
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
                      className={`relative flex flex-col items-center gap-1 rounded-xl border-2 transition-all duration-150 ${
                        isDropOver
                          ? "border-orange-400 ring-2 ring-orange-300 bg-orange-50 dark:bg-orange-900/20 scale-105 p-3"
                          : isDraggingAccount
                            ? "border-dashed border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10 cursor-copy p-3 min-w-[96px] min-h-[100px] justify-center"
                            : "border-transparent p-2"
                      }`}
                      onDrop={(e) => handleDropOnExpense(e, exp)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTarget(`exp-${exp.id}`); }}
                      onDragLeave={() => setDragOverTarget(null)}
                    >
                      {isDraggingAccount && !isDropOver && (
                        <span className="absolute top-1 right-1.5 text-[9px] font-semibold text-orange-400">drop here</span>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">This month</h2>
              {isOverBudget ? <AlertCircle className="h-6 w-6 text-red-500" /> : <CheckCircle className="h-6 w-6 text-green-500" />}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Income (onboarding)</div>
                <div className="text-xl font-bold text-[#2f6064]">
                  R{pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Planned expenses (onboarding)</div>
                <div className="text-xl font-bold">
                  R{pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Spent this month</div>
                <div className={`text-xl font-bold ${plannedBalance < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  R{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded">
                <div className="text-sm text-gray-500">Balance</div>
                <div className={`text-xl font-bold ${plannedBalance < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  R{plannedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                Currently budgeted: R{allocModal.existing.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Enter 0 to remove.
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
                disabled={!newExpenseName.trim() || !newExpenseAmount || Number(newExpenseAmount) <= 0}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                Add
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
                disabled={!newIncomeName.trim() || !newIncomeAmount || Number(newIncomeAmount) <= 0}
                className="flex-1 py-2.5 bg-[#2f6064] hover:bg-[#255055] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                Add
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
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTransfer(); if (e.key === "Escape") { setTransferModal(null); setTransferAmount(""); } }}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
              />
            </div>

            {transferModal.existing > 0 && (
              <p className="text-xs text-gray-400 mb-4">
                Current flow amount: R{transferModal.existing.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Enter 0 to remove.
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
                onClick={() => { setTransferModal(null); setTransferAmount(""); }}
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
