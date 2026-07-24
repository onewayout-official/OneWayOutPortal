"use client";

import { useState, useEffect } from "react";
import { Debt, DebtType } from "@/types";
import { storage } from "@/lib/storage";
import { format } from "date-fns";
import { Trash2, Plus, TrendingDown } from "lucide-react";

const debtTypes: DebtType[] = ["Credit Card", "Loan", "Mortgage", "Other"];

export default function DebtList() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Debt, "id" | "createdAt">>({
    name: "",
    totalAmount: 0,
    remainingAmount: 0,
    interestRate: 0,
    minimumPayment: 0,
    dueDate: new Date().toISOString().split("T")[0],
    type: "Credit Card",
  });

  useEffect(() => {
    storage.getDebts().then(setDebts);
  }, []);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const newDebt: Debt = {
      ...formData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await storage.addDebt(newDebt);
    setDebts(await storage.getDebts());
    setFormData({
      name: "",
      totalAmount: 0,
      remainingAmount: 0,
      interestRate: 0,
      minimumPayment: 0,
      dueDate: new Date().toISOString().split("T")[0],
      type: "Credit Card",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this debt?")) {
      await storage.deleteDebt(id);
      setDebts(await storage.getDebts());
    }
  };

  const handlePayment = async (id: string, amount: number) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;

    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    await storage.updateDebt(id, { remainingAmount: newRemaining });
    setDebts(await storage.getDebts());
  };

  const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalMinimumPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Debts</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Total Remaining: <span className="font-semibold text-red-600">${totalDebt.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Monthly Minimum Payments: <span className="font-semibold">${totalMinimumPayments.toFixed(2)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Debt
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddDebt} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Debt Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Debt Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DebtType })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              {debtTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Amount ($)</label>
              <input
                type="number"
                value={formData.totalAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    totalAmount: val,
                    remainingAmount: formData.remainingAmount === 0 ? val : formData.remainingAmount,
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Remaining Amount ($)</label>
              <input
                type="number"
                value={formData.remainingAmount}
                onChange={(e) => setFormData({ ...formData, remainingAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
              <input
                type="number"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Payment ($)</label>
              <input
                type="number"
                value={formData.minimumPayment}
                onChange={(e) => setFormData({ ...formData, minimumPayment: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Add Debt
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {debts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No debts tracked yet. Add your first debt to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => {
            const progress = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
            return (
              <div
                key={debt.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{debt.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {debt.type} • Due: {format(new Date(debt.dueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(debt.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                    <span className="font-semibold text-red-600">${debt.remainingAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Original Amount</span>
                    <span className="text-gray-900 dark:text-white">${debt.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Interest Rate</span>
                    <span className="text-gray-900 dark:text-white">{debt.interestRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Minimum Payment</span>
                    <span className="text-gray-900 dark:text-white">${debt.minimumPayment.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {debt.remainingAmount > 0 && (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="number"
                      placeholder="Payment amount"
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      min="0"
                      step="0.01"
                      id={`payment-${debt.id}`}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`payment-${debt.id}`) as HTMLInputElement;
                        const amount = parseFloat(input.value) || 0;
                        if (amount > 0) {
                          handlePayment(debt.id, amount);
                          input.value = "";
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <TrendingDown className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


