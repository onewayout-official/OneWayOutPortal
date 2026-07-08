"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, Coins, Copy, Settings2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import PointsGiftCardSpend from "@/components/PointsGiftCardSpend";
import { rewards } from "@/lib/gamification/rewards";
import { storage } from "@/lib/storage";
import { fetchGiftcardStatuses } from "@/lib/yoyo/client";
import { giftcardStatusFromState } from "@/lib/yoyo/giftcardStatus";
import type { GiftcardStatusItem } from "@/lib/yoyo/types";
import { RewardTransaction, SpendCategory, UserProfile } from "@/types";

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

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
): string {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function getMetadataNumber(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = metadata?.[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatExpiryDate(value: string): string | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  }
  return value.trim();
}

function statusBadgeClass(label: GiftcardStatusItem["statusLabel"]): string {
  switch (label) {
    case "Active":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "Redeemed":
      return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    case "Expired":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "Deactivated":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

export default function SpendTracker() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [spendingHistory, setSpendingHistory] = useState<RewardTransaction[]>([]);
  const [giftcardStatuses, setGiftcardStatuses] = useState<Record<string, GiftcardStatusItem>>({});
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
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadGiftcardStatuses = useCallback(async (history: RewardTransaction[]) => {
    const giftcardIds = history
      .map((transaction) =>
        getMetadataString(transaction.metadata, ["giftcard_id", "giftcardId"])
      )
      .filter(Boolean);

    if (giftcardIds.length === 0) {
      setGiftcardStatuses({});
      return;
    }

    try {
      const result = await fetchGiftcardStatuses(giftcardIds);
      setGiftcardStatuses(result.statuses);
    } catch (err) {
      console.error("[SpendTracker] giftcard statuses:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [userProfile, budgetMap, rewardHistory] = await Promise.all([
      storage.getProfile(),
      storage.getSpendBudgets(),
      rewards.getRewardHistory(30),
    ]);
    const gamification = await rewards.getGamificationState();
    if (userProfile) {
      userProfile.userPoints = gamification.balance;
    }
    const spendHistory = rewardHistory.filter((transaction) => transaction.pointsDelta < 0);
    setProfile(userProfile);
    setEditBudgets(budgetMap);
    setSpendingHistory(spendHistory);
    setIsLoading(false);
    void loadGiftcardStatuses(spendHistory);
  }, [loadGiftcardStatuses]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const refreshSpendingHistory = async () => {
    const rewardHistory = await rewards.getRewardHistory(30);
    const spendHistory = rewardHistory.filter((transaction) => transaction.pointsDelta < 0);
    setSpendingHistory(spendHistory);
    await loadGiftcardStatuses(spendHistory);
  };

  const copyRedeemCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ignore clipboard failures */
    }
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
        onSpendComplete={refreshSpendingHistory}
      />

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              Spending history
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Recent points spent from your rewards balance.
            </p>
          </div>
        </div>

        {spendingHistory.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {spendingHistory.map((transaction) => {
              const storeName = getMetadataString(transaction.metadata, ["store_name", "storeName"]);
              const campaignName = getMetadataString(transaction.metadata, [
                "campaign_name",
                "campaignName",
              ]);
              const redeemCode = getMetadataString(transaction.metadata, [
                "wi_code",
                "wiCode",
                "wicode",
              ]);
              const amountRand = getMetadataNumber(transaction.metadata, [
                "amount_rand",
                "amountRand",
              ]);
              const giftcardId = getMetadataString(transaction.metadata, [
                "giftcard_id",
                "giftcardId",
              ]);
              const fallbackStateId = getMetadataString(transaction.metadata, [
                "state_id",
                "stateId",
              ]);
              const liveStatus = giftcardId ? giftcardStatuses[giftcardId] : undefined;
              const status =
                liveStatus ??
                (fallbackStateId
                  ? {
                      ...giftcardStatusFromState(fallbackStateId),
                      id: giftcardId,
                    }
                  : null);
              const expiryDateRaw =
                liveStatus?.expiryDate ||
                getMetadataString(transaction.metadata, ["expiry_date", "expiryDate"]);
              const expiryDate = formatExpiryDate(expiryDateRaw);
              const title =
                storeName ||
                campaignName ||
                (transaction.kind === "redeem"
                  ? "Points redeemed"
                  : transaction.source || "Points spent");

              return (
                <div
                  key={transaction.id}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{title}</p>
                      {status && status.statusLabel !== "Unknown" && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(status.statusLabel)}`}
                        >
                          {status.statusLabel === "Active"
                            ? "Active · not redeemed"
                            : status.statusLabel === "Redeemed"
                              ? "Redeemed · used"
                              : status.statusLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(transaction.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {amountRand != null ? ` · R ${amountRand.toFixed(2)}` : ""}
                    </p>
                    {expiryDate && status?.statusLabel === "Active" && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        Expires {expiryDate}
                      </p>
                    )}
                    {redeemCode && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-gray-100 dark:bg-gray-900 px-2 py-1 font-mono text-xs text-gray-900 dark:text-white">
                          {redeemCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyRedeemCode(redeemCode)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          <Copy className="h-3 w-3" />
                          Copy code
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                    {transaction.pointsDelta.toLocaleString()} pts
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No spending history yet.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gift card redemptions will appear here after you spend points.
            </p>
          </div>
        )}
      </div>

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
