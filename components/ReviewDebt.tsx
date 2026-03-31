"use client";

import { useState, useEffect } from "react";
import { Debt, DebtType, Liability, RegistrationExpense } from "@/types";
import { storage } from "@/lib/storage";
import { format } from "date-fns";
import {
  FileText,
  AlertCircle,
  TrendingDown,
  Calendar,
  DollarSign,
  ClipboardList,
  Wallet,
  Plus,
  Banknote,
  Pencil,
} from "lucide-react";
import Link from "next/link";

const DEBT_TYPES: DebtType[] = ["Credit Card", "Loan", "Mortgage", "Other"];

/** Expense categories that are debt payments (onboarding expenses form) */
const DEBT_PAYMENT_CATEGORIES = [
  "Personal Loan Payments",
  "Home Loan Payments",
  "Vehicle Loan Payments",
  "Credit Card Payments",
] as const;

/** Normalized onboarding loan/liability entry for display */
type OnboardingDebtEntry = {
  id: string;
  name: string;
  category: string;
  type: string;
  amount: number;
  personal: number;
  interestRate: number;
};

/** Debt payment budget entry from onboarding expenses */
type DebtPaymentBudgetEntry = {
  id: string;
  name: string;
  category: string;
  type: string;
  amount: number;
  personal: number;
};

const emptyDebtForm = (): Omit<Debt, "id" | "createdAt"> => ({
  name: "",
  totalAmount: 0,
  remainingAmount: 0,
  interestRate: 0,
  minimumPayment: 0,
  dueDate: new Date().toISOString().split("T")[0],
  type: "Credit Card",
});

export default function ReviewDebt() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [onboardingEntries, setOnboardingEntries] = useState<OnboardingDebtEntry[]>([]);
  const [debtPaymentBudgets, setDebtPaymentBudgets] = useState<DebtPaymentBudgetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [addDebtForm, setAddDebtForm] = useState(emptyDebtForm());

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editForm, setEditForm] = useState(emptyDebtForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [debtList, liabilities, legacy, budgetExpenses] = await Promise.all([
      storage.getDebts(),
      storage.getLiabilities(),
      storage.getOnboardingData(),
      storage.getBudgetExpenses(),
    ]);
    setDebts(debtList);

    // Prefer liabilities table; fall back to legacy onboarding_data.liabilities
    const entries: OnboardingDebtEntry[] = [];
    if (liabilities.length > 0) {
      liabilities.forEach((l: Liability) => {
        const total = l.personal;
        if (total > 0) {
          entries.push({
            id: l.id,
            name: l.name || l.category,
            category: l.category,
            type: l.type,
            amount: total,
            personal: l.personal,
            interestRate: l.interestRate ?? 0,
          });
        }
      });
    } else if (legacy.liabilities?.length > 0) {
      legacy.liabilities.forEach((item: any, index: number) => {
        const total = item.total ?? (Number(item.personal) || 0);
        if (total > 0) {
          entries.push({
            id: `legacy-${index}-${item.name ?? item.expenses ?? ""}`,
            name: item.name || item.expenses || "Liability",
            category: item.expenses ?? item.category ?? "—",
            type: item.expenseType ?? item.type ?? "—",
            amount: total,
            personal: Number(item.personal) || 0,
            interestRate: Number(item.interestRate) || 0,
          });
        }
      });
    }
    setOnboardingEntries(entries);

    // Debt payment entries from onboarding expenses (budget_expenses or legacy)
    const paymentEntries: DebtPaymentBudgetEntry[] = [];
    if (budgetExpenses.length > 0) {
      budgetExpenses.forEach((e: RegistrationExpense) => {
        if (DEBT_PAYMENT_CATEGORIES.includes(e.category as typeof DEBT_PAYMENT_CATEGORIES[number])) {
          const total = e.personal;
          if (total > 0) {
            paymentEntries.push({
              id: e.id,
              name: e.name || e.category,
              category: e.category,
              type: e.type,
              amount: total,
              personal: e.personal,
            });
          }
        }
      });
    } else if (legacy.expenses?.length > 0) {
      legacy.expenses.forEach((item: any, index: number) => {
        const cat = item.expenseCategory ?? item.category;
        if (cat && DEBT_PAYMENT_CATEGORIES.includes(cat)) {
          const total = item.total ?? (Number(item.personal) || 0);
          if (total > 0) {
            paymentEntries.push({
              id: `legacy-exp-${index}-${item.name ?? cat ?? ""}`,
              name: item.name || cat || "Debt payment",
              category: cat,
              type: item.expenseType ?? item.type ?? "Fixed",
              amount: total,
              personal: Number(item.personal) || 0,
            });
          }
        }
      });
    }
    setDebtPaymentBudgets(paymentEntries);
    setIsLoading(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount) || 0;
    const debt = debts.find((d) => d.id === paymentDebtId);
    if (!debt || amount <= 0) return;
    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    await storage.updateDebt(paymentDebtId, { remainingAmount: newRemaining });
    setShowPaymentModal(false);
    setPaymentDebtId("");
    setPaymentAmount("");
    loadData();
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const newDebt: Debt = {
      ...addDebtForm,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await storage.addDebt(newDebt);
    setShowAddDebtModal(false);
    setAddDebtForm(emptyDebtForm());
    loadData();
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setEditForm({
      name: debt.name,
      totalAmount: debt.totalAmount,
      remainingAmount: debt.remainingAmount,
      interestRate: debt.interestRate,
      minimumPayment: debt.minimumPayment,
      dueDate: debt.dueDate,
      type: debt.type,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    await storage.updateDebt(editingDebt.id, {
      name: editForm.name,
      totalAmount: editForm.totalAmount,
      remainingAmount: editForm.remainingAmount,
      interestRate: editForm.interestRate,
      minimumPayment: editForm.minimumPayment,
      dueDate: editForm.dueDate,
      type: editForm.type,
    });
    setShowEditModal(false);
    setEditingDebt(null);
    setEditForm(emptyDebtForm());
    loadData();
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

  const totalTrackedDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalOnboarding = onboardingEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalDebt = totalTrackedDebt + totalOnboarding;
  const totalMinimumPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const totalBudgetedDebtPayments = debtPaymentBudgets.reduce((sum, e) => sum + e.amount, 0);
  const overdueDebts = debts.filter((debt) => new Date(debt.dueDate) < new Date());

  // Calculate debt payoff timeline (simplified; only for tracked debts with minimum payments)
  const monthsToPayoff = totalTrackedDebt > 0 && totalMinimumPayments > 0
    ? Math.ceil(totalTrackedDebt / totalMinimumPayments)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Debt</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">See what you owe today</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowPaymentModal(true)}
          disabled={debts.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Banknote className="h-5 w-5" />
          Add Payment
        </button>
        <button
          type="button"
          onClick={() => setShowAddDebtModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Debt
        </button>
        <button
          type="button"
          onClick={() => {
            setEditingDebt(null);
            setShowEditModal(true);
          }}
          disabled={debts.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Pencil className="h-5 w-5" />
          Edit
        </button>
      </div>

      {/* Debt Summary (tracked + onboarding) */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Total Debt Overview</h2>
          <TrendingDown className="h-6 w-6" />
        </div>
        <div className="text-4xl font-bold mb-2">
          ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p className="text-sm opacity-90">
          {debts.length} tracked {debts.length === 1 ? "debt" : "debts"}
          {onboardingEntries.length > 0 &&
            ` • ${onboardingEntries.length} from onboarding`}
        </p>
        {totalMinimumPayments > 0 && (
          <p className="text-sm opacity-90 mt-1">
            ${totalMinimumPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month minimum (tracked debts)
          </p>
        )}
        {totalTrackedDebt > 0 && totalOnboarding > 0 && (
          <p className="text-xs opacity-80 mt-2">
            Tracked: ${totalTrackedDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Onboarding: ${totalOnboarding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
        {totalBudgetedDebtPayments > 0 && (
          <p className="text-xs opacity-80 mt-2">
            Budgeted for debt repayment (onboarding): ${totalBudgetedDebtPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month
          </p>
        )}
      </div>

      {/* Overdue Alert */}
      {overdueDebts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">
                {overdueDebts.length} {overdueDebts.length === 1 ? "Debt is" : "Debts are"} Overdue
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">
                Please review and make payments as soon as possible to avoid additional fees.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Debt Payoff Timeline */}
      {monthsToPayoff > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payoff Timeline</h2>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {monthsToPayoff} {monthsToPayoff === 1 ? "Month" : "Months"}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Estimated time to pay off all debts at minimum payment rate
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Paying more than the minimum will reduce this timeline
            </p>
          </div>
        </div>
      )}

      {/* Debt List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Debts</h2>
          <Link
            href="/debts"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage Debts
          </Link>
        </div>
        {debts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No debts recorded</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              You're debt-free! Keep up the great work.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {debts.map((debt) => {
              const isOverdue = new Date(debt.dueDate) < new Date();
              const progress = debt.totalAmount > 0
                ? ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100
                : 0;

              return (
                <div
                  key={debt.id}
                  className={`p-4 rounded-lg border-2 ${isOverdue
                    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Debt Name: {debt.name}</h3>
                        {isOverdue && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Debt Type: {debt.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(debt)}
                        className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit debt"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${debt.remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        of ${debt.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Progress</span>
                      <span>{progress.toFixed(1)}% paid</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum Payment</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${debt.minimumPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                        <p className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
                          {format(new Date(debt.dueDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loans & liabilities from onboarding */}
      {onboardingEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-500" />
              From onboarding
            </h2>
            <Link
              href="/liabilities"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Liabilities
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Loan and debt entries you added during registration or onboarding.
          </p>
          <div className="space-y-3">
            {onboardingEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Debt Name: {entry.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Debt Type: {entry.category} • {entry.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {entry.personal > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Personal ${entry.personal.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                {entry.interestRate > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Interest rate: {entry.interestRate}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debt payments from onboarding expenses form */}
      {debtPaymentBudgets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              Debt payments (from onboarding)
            </h2>
            <Link
              href="/expenses"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Expenses
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Monthly amounts you set for debt repayment in the onboarding expenses form. Tied to your debt picture above.
          </p>
          <div className="space-y-3">
            {debtPaymentBudgets.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Debt Name: {entry.name || entry.category}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Debt Type: {entry.category} • {entry.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                    </div>
                    {entry.personal > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Personal ${entry.personal.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Total budgeted for debt repayment: ${totalBudgetedDebtPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month
          </p>
        </div>
      )}

      {/* Debt Management Tips */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Debt Management Tips</h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
              <li>Pay more than the minimum when possible to reduce interest</li>
              <li>Focus on high-interest debts first (debt avalanche method)</li>
              <li>Consider debt consolidation if you have multiple high-interest debts</li>
              <li>Set up automatic payments to avoid late fees</li>
              <li>Track your progress regularly to stay motivated</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-500" />
                Add Payment
              </h2>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Debt</label>
                  <select
                    value={paymentDebtId}
                    onChange={(e) => setPaymentDebtId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select a debt</option>
                    {debts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — ${d.remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPaymentModal(false); setPaymentDebtId(""); setPaymentAmount(""); }}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Debt modal */}
      {showAddDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full my-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                Add Debt
              </h2>
              <form onSubmit={handleAddDebt} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Debt Name</label>
                  <input
                    type="text"
                    value={addDebtForm.name}
                    onChange={(e) => setAddDebtForm({ ...addDebtForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g. Credit Card, Car Loan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Debt Type</label>
                  <select
                    value={addDebtForm.type}
                    onChange={(e) => setAddDebtForm({ ...addDebtForm, type: e.target.value as DebtType })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {DEBT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addDebtForm.totalAmount || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setAddDebtForm({ ...addDebtForm, totalAmount: val, remainingAmount: addDebtForm.remainingAmount === 0 ? val : addDebtForm.remainingAmount });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remaining ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addDebtForm.remainingAmount || ""}
                      onChange={(e) => setAddDebtForm({ ...addDebtForm, remainingAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addDebtForm.interestRate || ""}
                      onChange={(e) => setAddDebtForm({ ...addDebtForm, interestRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Payment ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addDebtForm.minimumPayment || ""}
                      onChange={(e) => setAddDebtForm({ ...addDebtForm, minimumPayment: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={addDebtForm.dueDate}
                    onChange={(e) => setAddDebtForm({ ...addDebtForm, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Add Debt
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddDebtModal(false); setAddDebtForm(emptyDebtForm()); }}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Debt modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full my-8">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-gray-500" />
                Edit Debt
              </h2>
              {!editingDebt ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select debt to edit</label>
                  <select
                    value=""
                    onChange={(e) => {
                      const id = e.target.value;
                      const debt = debts.find((d) => d.id === id);
                      if (debt) openEditModal(debt);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Choose a debt...</option>
                    {debts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Debt Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Debt Type</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as DebtType })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {DEBT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.totalAmount || ""}
                        onChange={(e) => setEditForm({ ...editForm, totalAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remaining ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.remainingAmount || ""}
                        onChange={(e) => setEditForm({ ...editForm, remainingAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.interestRate || ""}
                        onChange={(e) => setEditForm({ ...editForm, interestRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Payment ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.minimumPayment || ""}
                        onChange={(e) => setEditForm({ ...editForm, minimumPayment: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingDebt(null); setShowEditModal(false); }}
                      className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
