"use client";

import { useState, useEffect } from "react";
import { SpendCategory, UserProfile } from "@/types";
import { storage } from "@/lib/storage";
import { rewards } from "@/lib/gamification/rewards";
import { ShoppingCart, Settings2, Coins } from "lucide-react";
import Link from "next/link";
import PointsGiftCardSpend from "@/components/PointsGiftCardSpend";

const SPEND_CATEGORIES: { id: SpendCategory; label: string }[] = [
  { id: "Grocery", label: "Grocery" },
  { id: "Fuel", label: "Fuel" },
  { id: "Electricity", label: "Electricity" },
  { id: "Airtime", label: "Airtime" },
  { id: "Water", label: "Water" },
  { id: "Rent", label: "Rent" },
  { id: "Transport", label: "Transport" },
  { id: "Send to others", label: "Send to others" },
];

export default function SpendTracker() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [userProfile, budgetMap] = await Promise.all([
      storage.getProfile(),
      storage.getSpendBudgets(),
    ]);
    const gamification = await rewards.getGamificationState();
    if (userProfile) {
      userProfile.userPoints = gamification.balance;
    }
    setProfile(userProfile);
    setEditBudgets(budgetMap);
    setIsLoading(false);
  };

  const handleSaveBudgets = async () => {
    await storage.saveSpendBudgets(editBudgets);
    setShowBudgetModal(false);
  };

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
            <p className="text-sm text-gray-600 dark:text-gray-400">Redeem your earned points</p>
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

      <PointsGiftCardSpend
        pointsBalance={profile?.userPoints ?? 0}
        onPointsChange={(balance) => {
          if (profile) setProfile({ ...profile, userPoints: balance });
        }}
      />

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
