"use client";

import { useState } from "react";
import { DollarSign, Loader2, Plus } from "lucide-react";
import { storage } from "@/lib/storage";
import {
  cloneDefaultBudgetExpenseRows,
  toRegistrationExpenses,
  type BudgetExpenseRow,
} from "@/lib/budgetExpenseDefaults";

type NewExpenseDraft = {
  expenseCategory: string;
  expenseType: "" | "Fixed" | "Variable";
  name: string;
  personal: number;
  total: number;
  points: number;
  namePlaceholder: string;
};

const EMPTY_NEW_EXPENSE: NewExpenseDraft = {
  expenseCategory: "",
  expenseType: "",
  name: "",
  personal: 0,
  total: 0,
  points: 0,
  namePlaceholder: "",
};

export type BudgetExpensesFormProps = {
  initialRows?: BudgetExpenseRow[];
  onSaved: () => void;
  onCancel?: () => void;
};

export default function BudgetExpensesForm({
  initialRows,
  onSaved,
  onCancel,
}: BudgetExpensesFormProps) {
  const [rows, setRows] = useState<BudgetExpenseRow[]>(() =>
    initialRows?.length
      ? initialRows.map((r) => ({ ...r, total: r.personal || r.total || 0 }))
      : cloneDefaultBudgetExpenseRows()
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpenseDraft>(EMPTY_NEW_EXPENSE);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const totalFixed = rows
    .filter((e) => e.expenseType === "Fixed")
    .reduce((sum, entry) => sum + (entry.total || 0), 0);
  const totalVariable = rows
    .filter((e) => e.expenseType === "Variable")
    .reduce((sum, entry) => sum + (entry.total || 0), 0);
  const totalExpenses = rows.reduce((sum, entry) => sum + (entry.total || 0), 0);
  const totalPoints = rows.reduce(
    (sum, entry) => sum + (entry.personal > 0 ? (entry.points ?? 0) : 0),
    0
  );

  const updateRow = (index: number, field: keyof BudgetExpenseRow, value: string | number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "personal") {
        const personal = Number(value) || 0;
        updated[index].personal = personal;
        updated[index].total = personal;
      }
      return updated;
    });
  };

  const openAddModal = () => {
    setNewExpense(EMPTY_NEW_EXPENSE);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewExpense(EMPTY_NEW_EXPENSE);
  };

  const updateNewExpense = (field: keyof NewExpenseDraft, value: string | number) => {
    setNewExpense((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "personal") {
        updated.total = Number(value) || 0;
      }
      return updated;
    });
  };

  const addNewExpense = () => {
    if (!newExpense.expenseCategory.trim() || !newExpense.expenseType) return;
    const expenseType = newExpense.expenseType as "Fixed" | "Variable";
    setRows((prev) => [
      ...prev,
      {
        expenseCategory: newExpense.expenseCategory.trim(),
        expenseType,
        name: newExpense.name,
        personal: newExpense.personal,
        total: newExpense.total,
        points: newExpense.points,
        namePlaceholder: newExpense.namePlaceholder || "Various",
      },
    ]);
    closeAddModal();
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      const items = toRegistrationExpenses(rows);
      await storage.saveBudgetExpenses(items);
      onSaved();
    } catch (error) {
      console.error("Failed to save budget expenses:", error);
      setSaveError("Could not save right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4">
          <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Monthly budget expenses</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your monthly amounts for each expense category
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600">
                <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Type</th>
                <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Amount (R)</th>
                <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Total</th>
                <th className="text-left py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, index) => (
                <tr
                  key={`${entry.id ?? entry.expenseCategory}-${index}`}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">
                    {entry.expenseCategory}
                  </td>
                  <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">
                    {entry.expenseType}
                  </td>
                  <td className="py-2 px-2 whitespace-normal">
                    <input
                      type="text"
                      value={entry.name || ""}
                      onChange={(e) => updateRow(index, "name", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                      placeholder={entry.namePlaceholder}
                    />
                  </td>
                  <td className="py-2 px-2 whitespace-normal">
                    <input
                      type="number"
                      value={entry.personal || ""}
                      onChange={(e) => updateRow(index, "personal", parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                      placeholder="0"
                      min={0}
                      step="0.01"
                    />
                  </td>
                  <td className="py-2 px-2 text-sm text-gray-900 dark:text-white font-medium whitespace-normal">
                    R
                    {(entry.personal || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2 px-2 text-sm text-gray-900 dark:text-white whitespace-normal">
                    {entry.personal > 0 ? (entry.points ?? 0) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Fixed</span>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                R
                {totalFixed.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Variable</span>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                R
                {totalVariable.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Points</span>
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{totalPoints}</div>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Expenses</span>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                R
                {totalExpenses.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save budget"
          )}
        </button>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeAddModal}
            role="presentation"
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add expense</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  value={newExpense.expenseCategory}
                  onChange={(e) => updateNewExpense("expenseCategory", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. Groceries, Rent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={newExpense.expenseType}
                  onChange={(e) =>
                    updateNewExpense("expenseType", e.target.value as NewExpenseDraft["expenseType"])
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select type</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Variable">Variable</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => updateNewExpense("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Specific name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (R)</label>
                <input
                  type="number"
                  value={newExpense.personal || ""}
                  onChange={(e) => updateNewExpense("personal", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                  min={0}
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeAddModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addNewExpense}
                disabled={!newExpense.expenseCategory.trim() || !newExpense.expenseType}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

