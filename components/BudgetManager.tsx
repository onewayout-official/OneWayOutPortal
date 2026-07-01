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

type MobileDragSource = {
  type: "income" | "account";
  id: string;
  label: string;
};

type MobileDragSession = MobileDragSource & {
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
};

type MobileAutoScrollState = {
  frame: number | null;
  source: MobileDragSource | null;
  clientX: number;
  clientY: number;
  velocity: number;
};

type TransferModal =
  | {
      mode: "income_to_account";
      incomeId: string;
      incomeLabel: string;
      accountId: string;
      accountName: string;
      existing: number;
      incomeTotal: number;
      previousUsed: number;
      maxIncrement: number;
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
  disabled,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  colorClass = "text-[#2f6064]",
  bgClass = "bg-[#2f6064]/5 dark:bg-[#2f6064]/10 border-[#2f6064]/20",
  hoverRing = "hover:ring-[#2f6064]/40",
  liveAmount,
  liveAmountLabel,
  liveAmountPrefix,
  liveAmountTone,
  selected,
  onClick,
}: {
  item: IconItem;
  draggable?: boolean;
  disabled?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  colorClass?: string;
  bgClass?: string;
  hoverRing?: string;
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

  return (
    <div
      draggable={draggable && !disabled}
      onDragStart={disabled ? undefined : onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={disabled ? undefined : onPointerDown}
      onPointerMove={disabled ? undefined : onPointerMove}
      onPointerUp={disabled ? undefined : onPointerUp}
      onPointerCancel={disabled ? undefined : onPointerCancel}
      onClick={disabled ? undefined : onClick}
      className={`flex min-w-[76px] flex-none select-none flex-col items-center rounded-xl sm:min-w-[88px] ${onPointerDown ? "touch-none" : "touch-manipulation"} ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : draggable
            ? "cursor-grab active:cursor-grabbing"
            : onClick
              ? "cursor-pointer"
              : ""
      } ${selected ? "ring-2 ring-[#2f6064]/50 ring-offset-2 ring-offset-white dark:ring-offset-gray-800" : ""}`}
      title={title}
    >
      <div
        className={`p-3 rounded-full border ${bgClass} ${draggable && !disabled ? `hover:ring-2 ${hoverRing}` : ""} transition-shadow`}
      >
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
        <span
          className={`text-[12px] font-semibold mt-0.5 ${
            liveAmountTone === "danger" || liveAmountPrefix === "−"
              ? "text-red-600 dark:text-red-400"
              : liveAmountTone === "success"
                ? "text-green-600 dark:text-green-400"
              : liveAmountTone === "neutral"
                ? "text-gray-700 dark:text-gray-300"
              : liveAmountLabel === "Left"
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
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingAccount, setIsDraggingAccount] = useState(false);
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string | null>(null);
  const [mobileDragSource, setMobileDragSource] = useState<MobileDragSource | null>(null);
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
  const loadGeneration = useRef(0);
  const mobileDragRef = useRef<MobileDragSession | null>(null);
  const mobileAutoScrollRef = useRef<MobileAutoScrollState>({
    frame: null,
    source: null,
    clientX: 0,
    clientY: 0,
    velocity: 0,
  });
  const suppressNextTapRef = useRef(false);

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

  const getIncomeTotal = (item: IconItem): number => item.amount ?? 0;

  const getAllocatedAmount = (incomeId: string): number =>
    incomeTransferAmounts.get(incomeId) ?? 0;

  const getRemainingIncome = (item: IconItem): number =>
    Math.max(0, getIncomeTotal(item) - getAllocatedAmount(item.id));

  const getItemsForAccount = (accountId: string): IconItem[] =>
    allIncomeIcons.filter((i) => allocations.get(i.id) === accountId);

  const getIncomeAmountForAccount = (item: IconItem): number =>
    getAllocatedAmount(item.id);

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

  const getTotalExpenseAllocations = (): number => {
    let total = 0;
    for (const amount of expenseAllocations.values()) total += amount;
    return total;
  };

  const resetDragState = () => {
    setIsDragging(false);
    setIsDraggingAccount(false);
    setDragOverTarget(null);
    setMobileDragSource(null);
  };

  const clearTapSelection = () => {
    setSelectedIncomeId(null);
    setSelectedSourceAccountId(null);
  };

  const handleDragStart = (e: React.DragEvent, item: IconItem) => {
    if (getRemainingIncome(item) <= 0) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/income-id", item.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const handleAccountDragStart = (e: React.DragEvent, acc: UserAccount) => {
    e.dataTransfer.setData("application/account-id", acc.id);
    e.dataTransfer.effectAllowed = "copy";
    setIsDraggingAccount(true);
  };

  const openExpenseAllocationModal = (accountId: string, expItem: IconItem): boolean => {
    const acc = userAccounts.find((a) => a.id === accountId);
    if (!acc) return false;

    const existing = getAllocForExpense(acc.id, expItem.id);
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

    const incomeTotal = getIncomeTotal(incomeItem);
    const previousUsed = getAllocatedAmount(incomeId);
    const maxIncrement = Math.max(0, incomeTotal - previousUsed);
    if (maxIncrement <= 0) return false;

    setTransferAmount(String(maxIncrement));
    setTransferModal({
      mode: "income_to_account",
      incomeId,
      incomeLabel: incomeItem.category ?? incomeItem.label,
      accountId,
      accountName: targetAccount.name,
      existing: previousUsed,
      incomeTotal,
      previousUsed,
      maxIncrement,
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
    if (suppressNextTapRef.current) return;
    if (getRemainingIncome(item) <= 0) return;
    setSelectedSourceAccountId(null);
    setSelectedIncomeId((current) => current === item.id ? null : item.id);
  };

  const handleAccountTap = (acc: UserAccount) => {
    if (suppressNextTapRef.current) return;
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
    setSelectedSourceAccountId((current) => current === acc.id ? null : acc.id);
  };

  const handleExpenseTap = (expItem: IconItem) => {
    if (suppressNextTapRef.current) return;
    if (!selectedSourceAccountId) return;
    if (openExpenseAllocationModal(selectedSourceAccountId, expItem)) clearTapSelection();
  };

  const getMobileDropTarget = (source: MobileDragSource, clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!target) return null;

    if (source.type === "account") {
      const expenseTarget = target.closest<HTMLElement>("[data-drop-expense-id]");
      if (expenseTarget?.dataset.dropExpenseId) {
        return { type: "expense" as const, id: expenseTarget.dataset.dropExpenseId };
      }
    }

    const accountTarget = target.closest<HTMLElement>("[data-drop-account-id]");
    if (accountTarget?.dataset.dropAccountId) {
      return { type: "account" as const, id: accountTarget.dataset.dropAccountId };
    }

    return null;
  };

  const updateMobileDragTarget = (source: MobileDragSource, clientX: number, clientY: number) => {
    const target = getMobileDropTarget(source, clientX, clientY);
    const nextTarget =
      target?.type === "expense"
        ? `exp-${target.id}`
        : target?.type === "account"
          ? target.id
          : null;

    setDragOverTarget((current) => current === nextTarget ? current : nextTarget);
  };

  const stopMobileAutoScroll = () => {
    const state = mobileAutoScrollRef.current;
    if (state.frame != null) cancelAnimationFrame(state.frame);
    state.frame = null;
    state.source = null;
    state.velocity = 0;
  };

  const runMobileAutoScroll = () => {
    const state = mobileAutoScrollRef.current;
    if (!state.source || state.velocity === 0) {
      state.frame = null;
      return;
    }

    window.scrollBy(0, state.velocity);
    updateMobileDragTarget(state.source, state.clientX, state.clientY);
    state.frame = requestAnimationFrame(runMobileAutoScroll);
  };

  const updateMobileAutoScroll = (source: MobileDragSource, clientX: number, clientY: number) => {
    const edgeSize = 88;
    const maxSpeed = 16;
    const viewportHeight = window.innerHeight;
    let velocity = 0;

    if (clientY < edgeSize) {
      velocity = -Math.ceil(((edgeSize - clientY) / edgeSize) * maxSpeed);
    } else if (clientY > viewportHeight - edgeSize) {
      velocity = Math.ceil(((clientY - (viewportHeight - edgeSize)) / edgeSize) * maxSpeed);
    }

    const state = mobileAutoScrollRef.current;
    state.source = source;
    state.clientX = clientX;
    state.clientY = clientY;
    state.velocity = velocity;

    if (velocity === 0) {
      if (state.frame != null) cancelAnimationFrame(state.frame);
      state.frame = null;
      return;
    }

    if (state.frame == null) {
      state.frame = requestAnimationFrame(runMobileAutoScroll);
    }
  };

  const handleMobilePointerDown = (e: React.PointerEvent<HTMLElement>, source: MobileDragSource) => {
    if (e.pointerType === "mouse") return;

    stopMobileAutoScroll();
    mobileDragRef.current = {
      ...source,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMobilePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const session = mobileDragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    const moved = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
    if (!session.active && moved < 10) return;

    if (!session.active) {
      session.active = true;
      clearTapSelection();
      setMobileDragSource({ type: session.type, id: session.id, label: session.label });
      if (session.type === "income") setIsDragging(true);
      else setIsDraggingAccount(true);
    }

    e.preventDefault();
    updateMobileDragTarget(session, e.clientX, e.clientY);
    updateMobileAutoScroll(session, e.clientX, e.clientY);
  };

  const handleMobilePointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    const session = mobileDragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (session.active) {
      e.preventDefault();
      suppressNextTapRef.current = true;
      stopMobileAutoScroll();
      const target = getMobileDropTarget(session, e.clientX, e.clientY);

      if (session.type === "income" && target?.type === "account") {
        openIncomeTransferModal(session.id, target.id);
      } else if (session.type === "account" && target?.type === "expense") {
        const expense = expenseIcons.find((item) => item.id === target.id);
        if (expense) openExpenseAllocationModal(session.id, expense);
      } else if (session.type === "account" && target?.type === "account") {
        openAccountTransferModal(session.id, target.id);
      }

      window.setTimeout(() => {
        suppressNextTapRef.current = false;
      }, 0);
    }

    mobileDragRef.current = null;
    stopMobileAutoScroll();
    resetDragState();
  };

  const handleDropOnExpense = (e: React.DragEvent, expItem: IconItem) => {
    e.preventDefault();
    resetDragState();
    const raw = e.dataTransfer.getData("application/account-id");
    if (!raw) return;
    openExpenseAllocationModal(raw, expItem);
  };

  const handleSaveAllocation = async () => {
    if (!allocModal) return;
    invalidateBudgetLoads();
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
    resetDragState();
    const incomeId = e.dataTransfer.getData("application/income-id");
    if (incomeId) {
      openIncomeTransferModal(incomeId, accountId);
      return;
    }

    const sourceAccountId = e.dataTransfer.getData("application/account-id");
    if (sourceAccountId && sourceAccountId !== accountId) {
      openAccountTransferModal(sourceAccountId, accountId);
      return;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const closeTransferModal = () => {
    setTransferModal(null);
    setTransferAmount("");
    resetDragState();
    clearTapSelection();
  };

  const handleSaveTransfer = async () => {
    if (!transferModal) return;
    const rawAmount = Number(transferAmount.replace(/,/g, "").trim());
    if (isNaN(rawAmount) || rawAmount < 0) return;
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
          const increment = Math.min(rawAmount, currentTransfer.maxIncrement);
          const newTotal = Math.min(
            currentTransfer.incomeTotal,
            currentTransfer.previousUsed + increment
          );
          if (newTotal <= 0) return;

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
      invalidateBudgetLoads();
      storage.logBudgetActivity();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAccount = async (accountType: string) => {
    const name = newAccountName.trim();
    if (!name) return;
    invalidateBudgetLoads();
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
    invalidateBudgetLoads();
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

  const totalAllocatedToExpenses = getTotalExpenseAllocations();
  const monthlyBalance = pooledIncome - totalAllocatedToExpenses;
  const isOverBudget = monthlyBalance < 0;
  const selectedIncome = selectedIncomeId ? allIncomeIcons.find((item) => item.id === selectedIncomeId) : null;
  const selectedSourceAccount = selectedSourceAccountId ? userAccounts.find((account) => account.id === selectedSourceAccountId) : null;

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
            {new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:gap-6">
        {/* Left vertical bar — account drop zones grouped by type */}
        <aside className="flex flex-col items-stretch space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 xl:col-span-3 xl:border-0 xl:bg-transparent xl:p-0 xl:py-6 2xl:col-span-2">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Cash and Liquid Investments</div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 xl:hidden">
              Add accounts here, then tap or drag to allocate income and expenses.
            </p>
          </div>

          {ACCOUNT_TYPE_META.map(({ type, label, icon: TypeIcon, color }) => {
            const c = COLOR_MAP[color];
            const accountsOfType = userAccounts.filter((a) => a.accountType === type);
            const isWalletType = type === "wallet";
            const hideIncomeItems = type === "bank";

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
                        R {availableWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  const accountIncome = getAccountIncome(acc.id);
                  const total = getAccountTotal(acc.id);
                  const isOver = dragOverTarget === acc.id;
                  const isSelectedSource = selectedSourceAccountId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      data-drop-account-id={acc.id}
                      draggable
                      onClick={() => handleAccountTap(acc)}
                      onPointerDown={(e) => handleMobilePointerDown(e, { type: "account", id: acc.id, label: acc.name })}
                      onPointerMove={handleMobilePointerMove}
                      onPointerUp={handleMobilePointerEnd}
                      onPointerCancel={handleMobilePointerEnd}
                      onDragStart={(e) => { e.stopPropagation(); handleAccountDragStart(e, acc); }}
                      onDragEnd={handleDragEnd}
                      className={`w-full rounded-xl border-2 p-3 transition-all cursor-grab active:cursor-grabbing select-none touch-none ${
                        isOver
                          ? `${c.border} ${c.ring} ring-2 scale-[1.02]`
                          : isSelectedSource
                            ? `${c.border} ${c.ring} ring-2 scale-[1.01]`
                          : selectedIncomeId
                            ? `border-gray-300 dark:border-gray-600 ${c.ring}/30 ring-1`
                          : isDragging || isDraggingAccount
                            ? `border-gray-300 dark:border-gray-600 ${c.ring}/30 ring-1 animate-pulse`
                            : `border-gray-200 dark:border-gray-700 hover:${c.border} hover:shadow-sm`
                      }`}
                      title={selectedIncomeId ? `Tap to transfer selected income to ${acc.name}` : `Drag or tap this card to allocate budget from ${acc.name}`}
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
                          {accountIncome > 0 && (
                            <span className={`text-[10px] font-medium ${c.text}`}>
                              +R {accountIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {getAccountTransferIn(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-emerald-600">
                              +R {getAccountTransferIn(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} transfer in
                            </span>
                          )}
                          {getAccountTransferOut(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-amber-600">
                              −R {getAccountTransferOut(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} transfer out
                            </span>
                          )}
                          {getAccountExpenses(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-red-500">
                              −R {getAccountExpenses(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })} spent
                            </span>
                          )}
                          {getAccountAllocated(acc.id) > 0 && (
                            <span className="text-[10px] font-medium text-orange-500">
                              −R {getAccountAllocated(acc.id).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {accountIncome > 0 && !hideIncomeItems && (
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
                          {items.map((inc) => (
                            <div
                              key={inc.id}
                              className={`rounded-lg border px-2 py-1.5 text-center ${c.bg} ${c.border}`}
                              title={`${inc.category ?? inc.label}: R ${getIncomeAmountForAccount(inc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            >
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight block truncate">
                                {inc.category ?? inc.label}
                              </span>
                              <span className={`text-[12px] font-semibold ${c.text}`}>
                                +R {getIncomeAmountForAccount(inc).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg min-h-[40px]">
                          <span className="text-[10px] text-gray-400 text-center px-1">
                            {selectedIncomeId ? "Tap to add income" : "Drop income here"}
                          </span>
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
          <div className={`hidden w-full rounded-lg px-2 py-2 text-center transition-all duration-300 xl:block ${isDraggingAccount ? "bg-[#2f6064]/10 opacity-100" : "opacity-50"}`}>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-snug">
              {isDraggingAccount
                ? <span className="font-semibold text-[#2f6064]">Drop on an expense →</span>
                : <><span className="font-semibold">Drag any account card</span><br />→ drop on an expense to budget it</>
              }
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
                <span className="hidden items-center gap-1 text-[10px] font-normal text-gray-400 sm:flex">
                  <ArrowLeft className="h-3 w-3" /> drag to accounts
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
                  const remaining = getRemainingIncome(inc);
                  const isFullyAllocated = getIncomeTotal(inc) > 0 && remaining === 0;
                  return (
                    <IconCard
                      key={inc.id}
                      item={inc}
                      draggable={!isFullyAllocated}
                      disabled={isFullyAllocated}
                      onDragStart={(e) => handleDragStart(e, inc)}
                      onDragEnd={handleDragEnd}
                      onPointerDown={(e) => handleMobilePointerDown(e, { type: "income", id: inc.id, label: inc.category ?? inc.label })}
                      onPointerMove={handleMobilePointerMove}
                      onPointerUp={handleMobilePointerEnd}
                      onPointerCancel={handleMobilePointerEnd}
                      onClick={() => handleIncomeTap(inc)}
                      selected={selectedIncomeId === inc.id}
                      liveAmount={remaining}
                      liveAmountLabel="Left"
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No income items found from onboarding.</p>
            )}
          </div>

          {/* Row 3: Planned expenses — drop target for account allocations */}
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
            {isDraggingAccount && (
              <p className="text-[11px] text-orange-500 font-medium mb-3 flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Drop on an expense to set your budget for it
              </p>
            )}
            {expenseIcons.length > 0 ? (
              <div className="-mx-4 mt-2 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:items-start sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
                {expenseIcons.map((exp) => {
                  const allocated = getTotalAllocForExpense(exp.id);
                  const isDropOver = dragOverTarget === `exp-${exp.id}`;
                  return (
                    <div
                      key={exp.id}
                      data-drop-expense-id={exp.id}
                      className={`relative flex w-[104px] flex-none snap-start flex-col items-center gap-1 rounded-xl border-2 transition-all duration-150 sm:w-auto ${
                        isDropOver
                          ? "border-orange-400 ring-2 ring-orange-300 bg-orange-50 dark:bg-orange-900/20 scale-105 p-3"
                          : selectedSourceAccountId
                            ? "border-dashed border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10 cursor-pointer p-3 min-w-[96px] min-h-[100px] justify-center"
                          : isDraggingAccount
                            ? "border-dashed border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10 cursor-copy p-3 min-w-[96px] min-h-[100px] justify-center"
                            : "border-transparent p-2"
                      }`}
                      onClick={selectedSourceAccountId ? () => handleExpenseTap(exp) : undefined}
                      onDrop={(e) => handleDropOnExpense(e, exp)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTarget(`exp-${exp.id}`); }}
                      onDragLeave={() => setDragOverTarget(null)}
                    >
                      {(isDraggingAccount || selectedSourceAccountId) && !isDropOver && (
                        <span className="absolute top-1 right-1.5 text-[9px] font-semibold text-orange-400">
                          {selectedSourceAccountId ? "tap here" : "drop here"}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              <div className="rounded bg-gray-50 p-4 dark:bg-gray-900/20">
                <div className="text-sm text-gray-500">Income</div>
                <div className="break-words text-lg font-bold text-[#2f6064] sm:text-xl">
                  R {pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded bg-gray-50 p-4 dark:bg-gray-900/20">
                <div className="text-sm text-gray-500">Planned expenses</div>
                <div className="break-words text-lg font-bold sm:text-xl">
                  R {pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded bg-gray-50 p-4 dark:bg-gray-900/20">
                <div className="text-sm text-gray-500">Spent this month</div>
                <div className={`break-words text-lg font-bold sm:text-xl ${isOverBudget ? "text-red-600 dark:text-red-400" : ""}`}>
                  R {totalAllocatedToExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {mobileDragSource && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-gray-900 sm:hidden">
          Dragging {mobileDragSource.label}
        </div>
      )}

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
                max={transferModal.mode === "income_to_account" ? transferModal.maxIncrement : undefined}
                step="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveTransfer(); if (e.key === "Escape") closeTransferModal(); }}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
              />
            </div>

            {transferModal.mode === "income_to_account" && (
              <p className="text-xs text-gray-400 mb-4">
                Income total: R {transferModal.incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                {" "}Already allocated: R {transferModal.previousUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                {" "}Left to drag: R {transferModal.maxIncrement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                {" "}Enter how much to allocate from this drag (max R {transferModal.maxIncrement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Enter 0 to remove.
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
