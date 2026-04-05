"use client";

import { useState, useEffect } from "react";
import { Expense, SpendCategory, UserProfile } from "@/types";
import { storage } from "@/lib/storage";

type UserAccount = { id: string; accountType: string; name: string; sortOrder: number };
import {
  ShoppingCart,
  Fuel,
  Zap,
  Smartphone,
  Droplets,
  Home,
  Car,
  Plus,
  Settings2,
  Coins,
  Send,
} from "lucide-react";
import Link from "next/link";

const SPEND_CATEGORIES: { id: SpendCategory; label: string; Icon: typeof ShoppingCart }[] = [
  { id: "Grocery", label: "Grocery", Icon: ShoppingCart },
  { id: "Fuel", label: "Fuel", Icon: Fuel },
  { id: "Electricity", label: "Electricity", Icon: Zap },
  { id: "Airtime", label: "Airtime", Icon: Smartphone },
  { id: "Water", label: "Water", Icon: Droplets },
  { id: "Rent", label: "Rent", Icon: Home },
  { id: "Transport", label: "Transport", Icon: Car },
  { id: "Send to others", label: "Send to others", Icon: Send },
];

export default function SpendTracker() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<SpendCategory, number>>({
    Grocery: 0,
    Fuel: 0,
    Electricity: 0,
    Airtime: 0,
    Water: 0,
    Rent: 0,
    Transport: 0,
    "Send to others": 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editBudgets, setEditBudgets] = useState<Record<SpendCategory, number>>({
    Grocery: 0,
    Fuel: 0,
    Electricity: 0,
    Airtime: 0,
    Water: 0,
    Rent: 0,
    Transport: 0,
    "Send to others": 0,
  });
  const [formData, setFormData] = useState<{
    title: string;
    amount: number;
    category: SpendCategory;
    date: string;
    description: string;
    accountId: string;
  }>({
    title: "",
    amount: 0,
    category: "Grocery",
    date: new Date().toISOString().split("T")[0],
    description: "",
    accountId: "",
  });
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemNote, setRedeemNote] = useState("");
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [userProfile, expenseList, budgetMap, accounts] = await Promise.all([
      storage.getProfile(),
      storage.getExpenses(),
      storage.getSpendBudgets(),
      storage.getUserAccounts(),
    ]);
    setProfile(userProfile);
    setExpenses(expenseList);
    setBudgets(budgetMap);
    setEditBudgets(budgetMap);
    setUserAccounts(accounts);
    setIsLoading(false);
  };

  const handleRedeemPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    const amount = Math.floor(parseFloat(redeemPoints) || 0);
    const userPoints = profile?.userPoints ?? 0;
    if (amount <= 0) {
      setRedeemError("Enter a valid amount.");
      return;
    }
    if (amount > userPoints) {
      setRedeemError("Not enough points.");
      return;
    }
    if (!profile) return;
    const updated = { ...profile, userPoints: userPoints - amount };
    await storage.saveProfile(updated);
    setProfile(updated);
    setRedeemPoints("");
    setRedeemNote("");
    setShowRedeemForm(false);
  };

  const handleSaveBudgets = async () => {
    await storage.saveSpendBudgets(editBudgets);
    setBudgets(editBudgets);
    setShowBudgetModal(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await storage.addExpense({
      id: Date.now().toString(),
      title: formData.title,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
      description: formData.description || undefined,
      accountId: formData.accountId || undefined,
    });
    await loadData();
    setFormData({
      title: "",
      amount: 0,
      category: "Grocery",
      date: new Date().toISOString().split("T")[0],
      description: "",
      accountId: "",
    });
    setShowForm(false);
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const spentByCategory = SPEND_CATEGORIES.reduce(
    (acc, { id }) => {
      acc[id] = expenses
        .filter((e) => e.category === id && isCurrentMonth(e.date))
        .reduce((sum, e) => sum + e.amount, 0);
      return acc;
    },
    {} as Record<SpendCategory, number>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-rose-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-900/30">
            <ShoppingCart className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spend</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Redeem points and track spending by category
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowBudgetModal(true)}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Set budgets"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      </div>

      {/* Points balance (earned on Earn screen, redeem here) */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Your points</p>
            <p className="text-3xl font-bold">{(profile?.userPoints ?? 0).toLocaleString()}</p>
            <p className="text-xs opacity-80 mt-1">Earned on Earn screen · redeem below</p>
          </div>
          <Coins className="h-10 w-10 opacity-80" />
        </div>
        <Link
          href="/earn"
          className="mt-3 inline-block text-sm font-medium opacity-90 hover:underline"
        >
          Earn more on Earn →
        </Link>
      </div>

      {/* Redeem points */}
      {showRedeemForm ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Redeem points</h3>
          <form onSubmit={handleRedeemPoints} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Points to spend
              </label>
              <input
                type="number"
                min="1"
                max={profile?.userPoints ?? 0}
                value={redeemPoints}
                onChange={(e) => { setRedeemPoints(e.target.value); setRedeemError(null); }}
                placeholder="e.g. 50"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                value={redeemNote}
                onChange={(e) => setRedeemNote(e.target.value)}
                placeholder="What did you redeem for?"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {redeemError && (
              <p className="text-sm text-red-600 dark:text-red-400">{redeemError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Redeem
              </button>
              <button
                type="button"
                onClick={() => { setShowRedeemForm(false); setRedeemError(null); setRedeemPoints(""); setRedeemNote(""); }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowRedeemForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
        >
          <Coins className="h-5 w-5" />
          <span className="font-medium">Redeem points</span>
        </button>
      )}

      {/* Spending by category */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Spending by category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {SPEND_CATEGORIES.map(({ id, label, Icon }) => {
          const spent = spentByCategory[id];
          const budget = budgets[id];
          const isOver = budget > 0 && spent > budget;
          const progress = budget > 0 ? Math.min(1, spent / budget) : 0;

          return (
            <div
              key={id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col items-center text-center"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 w-full">
                {label}
              </p>
              <div className="relative mb-3">
                <svg className="w-14 h-14" viewBox="0 0 56 56">
                  {/* Circle background (grey) */}
                  <circle
                    cx="28"
                    cy="28"
                    r="26"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className={
                      isOver
                        ? "text-red-500"
                        : progress > 0
                          ? "text-orange-400"
                          : "text-gray-300 dark:text-gray-600"
                    }
                  />
                  {/* Progress fill (orange or red when over) */}
                  {progress > 0 && (
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      fill="none"
                      stroke={isOver ? "rgb(239 68 68)" : "rgb(251 146 60)"}
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - progress)}`}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                      style={{ transform: "rotate(-90deg)", transformOrigin: "28px 28px" }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon
                    className={`h-6 w-6 ${
                      isOver
                        ? "text-red-500"
                        : progress > 0
                          ? "text-orange-500 dark:text-orange-400"
                          : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                </div>
              </div>
              <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                $ {spent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {budget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Add expense */}
      {showForm ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Expense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What did you spend on?"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as SpendCategory })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {SPEND_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Paid from account
                </label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">— none —</option>
                  {userAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Add Expense
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Add Expense</span>
        </button>
      )}

      <div className="flex justify-end">
        <Link
          href="/expenses"
          className="text-sm text-rose-600 dark:text-rose-400 hover:underline"
        >
          View all expenses →
        </Link>
      </div>

      {/* Set budgets modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Set monthly budget
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter budget amount for each category (this month).
              </p>
              <div className="space-y-4">
                {SPEND_CATEGORIES.map(({ id, label }) => (
                  <div key={id}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editBudgets[id] || ""}
                      onChange={(e) =>
                        setEditBudgets({
                          ...editBudgets,
                          [id]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleSaveBudgets}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
