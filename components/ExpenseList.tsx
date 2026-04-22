"use client";

import { useState, useEffect } from "react";
import { Expense, ExpenseCategoryOld, RegistrationExpense } from "@/types";
import { storage } from "@/lib/storage";
import { format } from "date-fns";
import { Trash2, Plus, Wallet, Info, TrendingDown, BarChart3, PieChart } from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const categories: ExpenseCategoryOld[] = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Healthcare",
  "Education",
  "Other",
];

export default function ExpenseList() {
  type OnboardingExpenseRow = {
    id?: string;
    category?: RegistrationExpense["category"];
    type?: RegistrationExpense["type"];
    expenseCategory: string;
    expenseType: string;
    name: string;
    personal: number;
    total: number;
    points: number;
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Expense, "id">>({
    title: "",
    amount: 0,
    category: "Other",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [onboardingExpenses, setOnboardingExpenses] = useState<OnboardingExpenseRow[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpenses, setEditingExpenses] = useState<OnboardingExpenseRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [expenseList, budgetExpenses, onboarding] = await Promise.all([
        storage.getExpenses(),
        storage.getBudgetExpenses(),
        storage.getOnboardingData(),
      ]);
      setExpenses(expenseList);
      // Prefer budget_expenses table; fall back to onboarding_data
      if (budgetExpenses.length > 0) {
        setOnboardingExpenses(budgetExpenses.map((e) => ({
          id: e.id,
          category: e.category,
          type: e.type,
          expenseCategory: e.category,
          expenseType: e.type,
          name: e.name,
          personal: e.personal,
          total: e.personal,
          points: e.points,
        })));
      } else {
        setOnboardingExpenses((onboarding.expenses || []).map((e: any) => ({
          id: e.id,
          category: e.expenseCategory as RegistrationExpense["category"],
          type: (e.expenseType === "Variable" ? "Variable" : "Fixed") as RegistrationExpense["type"],
          expenseCategory: e.expenseCategory,
          expenseType: e.expenseType,
          name: e.name,
          personal: e.personal,
          total: e.total ?? e.personal,
          points: e.points,
        })));
      }
    })();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Expense = {
      ...formData,
      id: Date.now().toString(),
    };
    await storage.addExpense(newExpense);
    setExpenses(await storage.getExpenses());
    setFormData({
      title: "",
      amount: 0,
      category: "Other",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await storage.deleteExpense(id);
      setExpenses(await storage.getExpenses());
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalPersonal = onboardingExpenses.reduce((sum, item) => sum + (item.personal || 0), 0);
  const totalOnboarding = onboardingExpenses.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalPoints = onboardingExpenses.reduce((sum, item) => sum + (item.points || 0), 0);
  const fixedExpensesTotal = onboardingExpenses.reduce(
    (sum, item) =>
      String(item.expenseType || "").toLowerCase() === "fixed"
        ? sum + (item.personal || 0)
        : sum,
    0
  );
  const variableExpensesTotal = onboardingExpenses.reduce(
    (sum, item) =>
      String(item.expenseType || "").toLowerCase() === "variable"
        ? sum + (item.personal || 0)
        : sum,
    0
  );
  const onboardingExpensesByCategory = onboardingExpenses.reduce((acc, item) => {
    const category = item.expenseCategory || "Other";
    acc[category] = (acc[category] || 0) + (item.personal || 0);
    return acc;
  }, {} as Record<string, number>);

  const openEditModal = () => {
    setSaveError(null);
    setEditingExpenses(onboardingExpenses.map((item) => ({ ...item })));
    setIsEditModalOpen(true);
  };

  const updateEditingAmount = (idx: number, value: string) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setEditingExpenses((prev) =>
      prev.map((item, itemIdx) =>
        itemIdx === idx
          ? { ...item, personal: numericValue, total: numericValue }
          : item
      )
    );
  };

  const saveEditedAmounts = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const itemsToSave: RegistrationExpense[] = editingExpenses.map((item, idx) => ({
        id: item.id || crypto.randomUUID(),
        category: (item.category || item.expenseCategory) as RegistrationExpense["category"],
        type: (item.type || (item.expenseType === "Variable" ? "Variable" : "Fixed")) as RegistrationExpense["type"],
        name: item.name || `${item.expenseCategory} ${idx + 1}`,
        personal: item.personal || 0,
        spouse: 0,
        points: item.points || 0,
        editable: true,
      }));

      await storage.saveBudgetExpenses(itemsToSave);
      setOnboardingExpenses(editingExpenses.map((item) => ({ ...item, total: item.personal || 0 })));
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to save expense amounts:", error);
      setSaveError("Could not save right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Onboarding Expenses Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            Expense Categories
          </h2>
          <button
            type="button"
            onClick={openEditModal}
            disabled={onboardingExpenses.length === 0}
            className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit Amount
          </button>
        </div>

        {onboardingExpenses.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Personal Expenses</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-100 mt-1">
                    N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/30 dark:to-orange-800/30 rounded-lg p-4 border border-red-200 dark:border-red-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-300 font-medium">Total Expenses</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-100 mt-1">
                    N${totalOnboarding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Total Points</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-100 mt-1">
                    {totalPoints}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Amount</th>
                   
                    <th className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {onboardingExpenses.length > 0 ? (
                    onboardingExpenses.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-50 dark:hover:from-gray-700/50 dark:hover:to-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200">
                            {item.expenseCategory}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200">
                            {item.expenseType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900 dark:text-white">{item.name || "-"}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-gray-900 dark:text-white font-semibold">N${(item.personal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 font-bold">
                            {item.points || 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : null}
                </tbody>
                {onboardingExpenses.length > 0 && (
                  <tfoot>
                    <tr className="bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 border-t-2 border-red-200 dark:border-red-700">
                      <th scope="row" colSpan={3} className="px-6 py-4 font-bold text-gray-900 dark:text-white text-base">
                        Total Expenses
                      </th>
                      <td className="px-6 py-4 text-right">
                        <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                          N${totalPersonal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                          {totalPoints}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex gap-3">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>These are the expense categories from your onboarding setup. Points indicate the priority level of each expense category.</span>
            </p>
          </div>

          {/* Charts Section */}
          {onboardingExpenses.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-red-600" />
                Expense Analysis
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expenses by Category */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-red-600" />
                    Expenses by Category
                  </h4>
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <Pie
                      data={{
                        labels: Object.keys(onboardingExpensesByCategory),
                        datasets: [{
                          data: Object.values(onboardingExpensesByCategory),
                          backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'],
                          borderWidth: 0,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Expenses by Category (Bar) */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-red-600" />
                    Expenses by Category (Bar)
                  </h4>
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <Bar
                      data={{
                        labels: Object.keys(onboardingExpensesByCategory),
                        datasets: [{
                          label: "Total Expenses",
                          data: Object.values(onboardingExpensesByCategory),
                          backgroundColor: '#ef4444',
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: { beginAtZero: true }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expenses by Type (Pie) */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-red-600" />
                    Expenses by Type
                  </h4>
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <Pie
                      data={{
                        labels: ["Fixed", "Variable"],
                        datasets: [{
                          data: [fixedExpensesTotal, variableExpensesTotal],
                          backgroundColor: ['#ef4444', '#f97316'],
                          borderWidth: 0,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Expenses by Type (Bar) */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    Expenses by Type
                  </h4>
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <Bar
                      data={{
                        labels: ["Fixed", "Variable"],
                        datasets: [{
                          label: 'Total Expenses',
                          data: [fixedExpensesTotal, variableExpensesTotal],
                          backgroundColor: '#ef4444',
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: { beginAtZero: true }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
        ) : (
          <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex gap-3">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>No expense categories from onboarding. Complete the onboarding process to see your expense categories here.</span>
            </p>
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isSaving && setIsEditModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Expense Amounts</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[55vh]">
              {editingExpenses.map((item, idx) => (
                <div key={`${item.expenseCategory}-${idx}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.expenseCategory}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.name || item.expenseType}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount (N$)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.personal || 0}
                      onChange={(e) => updateEditingAmount(idx, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}

              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditedAmounts}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


