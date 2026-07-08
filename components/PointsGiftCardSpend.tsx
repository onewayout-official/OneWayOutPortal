"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Gift,
  Store,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  Copy,
  Search,
} from "lucide-react";
import { matchCampaignForStore } from "@/lib/yoyo/campaignMatch";
import { fetchYoyoCampaigns, spendPointsForGiftcard } from "@/lib/yoyo/client";
import {
  POINTS_PER_RAND,
  RETAIL_FOOTPRINT_TABS,
  randToPoints,
  type RetailStore,
} from "@/lib/yoyo/retailFootprint";
import { formatYoyoMobileNumber, isValidYoyoMobileNumber } from "@/lib/yoyo/phone";
import { storage } from "@/lib/storage";
import type { YoyoGiftcard, YoyoGiftcardCampaign } from "@/lib/yoyo/types";

type Step = "browse" | "confirm" | "success";

interface PointsGiftCardSpendProps {
  pointsBalance: number;
  onPointsChange: (balance: number) => void;
  onSpendComplete?: () => void | Promise<void>;
}

export default function PointsGiftCardSpend({
  pointsBalance,
  onPointsChange,
  onSpendComplete,
}: PointsGiftCardSpendProps) {
  const [activeTabId, setActiveTabId] = useState(RETAIL_FOOTPRINT_TABS[0].id);
  const [selectedStore, setSelectedStore] = useState<RetailStore | null>(null);
  const [amountRand, setAmountRand] = useState("");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<Step>("browse");
  const [campaigns, setCampaigns] = useState<YoyoGiftcardCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<YoyoGiftcard | null>(null);
  const [campaignLabel, setCampaignLabel] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [profilePhone, setProfilePhone] = useState<string | null>(null);

  const activeTab = RETAIL_FOOTPRINT_TABS.find((t) => t.id === activeTabId) ?? RETAIL_FOOTPRINT_TABS[0];

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeTab.stores;
    return activeTab.stores.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeTab.stores, search]);

  const amountNum = parseFloat(amountRand) || 0;
  const pointsCost = randToPoints(amountNum);

  const matchedCampaign = useMemo(() => {
    if (!selectedStore || !campaigns.length) return null;
    return matchCampaignForStore(selectedStore.name, campaigns);
  }, [selectedStore, campaigns]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    const result = await fetchYoyoCampaigns();
    setCampaignsLoading(false);
    if (!result.ok) {
      setCampaignsError(result.error ?? "Could not load Yoyo campaigns");
      setCampaigns([]);
      return;
    }
    setCampaigns(result.campaigns);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCampaigns);
  }, [loadCampaigns]);

  useEffect(() => {
    storage.getProfile().then((p) => {
      const phone = p?.phone?.trim() ?? "";
      setProfilePhone(phone || null);
      const formatted = formatYoyoMobileNumber(phone);
      if (formatted) {
        setMobileInput(formatted);
      } else if (phone) {
        setMobileInput(phone.replace(/\D/g, "").replace(/^0/, "27"));
      }
    });
  }, []);

  const validMobile = formatYoyoMobileNumber(mobileInput);

  const canProceed =
    selectedStore &&
    amountNum > 0 &&
    pointsCost <= pointsBalance &&
    activeTab.id !== "coming-soon" &&
    !selectedStore.apiOnly;

  const openConfirm = () => {
    if (!canProceed || !selectedStore) return;
    setError(null);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!selectedStore || amountNum <= 0) return;
    setSubmitting(true);
    setError(null);

    const result = await spendPointsForGiftcard({
      storeId: selectedStore.id,
      storeName: selectedStore.name,
      tabId: activeTabId,
      amountRand: amountNum,
      campaignId: matchedCampaign?.id,
      ...(validMobile ? { mobileNumber: validMobile } : {}),
    });

    setSubmitting(false);

    if (!result.ok) {
      const msg =
        result.error === "insufficient_points"
          ? "Not enough points for this amount."
          : result.error === "issue_failed"
            ? [
                result.responseDesc,
                result.responseCode ? `(code ${result.responseCode})` : null,
              ]
                .filter(Boolean)
                .join(" ") ||
              "Yoyo could not issue the gift card. Try again in a few seconds."
            : result.error === "no_campaign"
              ? "No gift card campaign available for this store."
              : result.error ?? "Something went wrong.";
      setError(msg);
      return;
    }

    if (result.pointsBalance != null) {
      onPointsChange(result.pointsBalance);
    }
    void Promise.resolve(onSpendComplete?.()).catch((err) => {
      console.error("[PointsGiftCardSpend] refresh spending history:", err);
    });
    setIssued(result.giftcard ?? null);
    setCampaignLabel(result.campaignName ?? matchedCampaign?.name ?? "");
    setStep("success");
  };

  const resetFlow = () => {
    setStep("browse");
    setIssued(null);
    setError(null);
    setAmountRand("");
    setSelectedStore(null);
  };

  const copyWiCode = async () => {
    if (!issued?.wiCode) return;
    try {
      await navigator.clipboard.writeText(issued.wiCode);
    } catch {
      /* ignore */
    }
  };

  if (step === "success" && issued) {
    const balanceRands = (issued.balance ?? 0) / 100;
    return (
      <div className="bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Gift card ready
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedStore?.name}
              {campaignLabel ? ` · ${campaignLabel}` : ""} · R
              {balanceRands.toFixed(2)}
            </p>
          </div>
        </div>

        {issued.wiCode && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <QrCode className="h-4 w-4" />
              wiCode (scan at store)
            </div>
            <p className="font-mono text-lg tracking-wider break-all text-gray-900 dark:text-white">
              {issued.wiCode}
            </p>
            <button
              type="button"
              onClick={copyWiCode}
              className="mt-2 inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400 hover:underline"
            >
              <Copy className="h-3 w-3" />
              Copy wiCode
            </button>
          </div>
        )}

        {issued.expiryDate && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Expires{" "}
            {(() => {
              const parsed = new Date(issued.expiryDate);
              return Number.isNaN(parsed.getTime())
                ? issued.expiryDate
                : parsed.toLocaleDateString(undefined, { dateStyle: "medium" });
            })()}
          </p>
        )}

        <p className="text-sm">
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Active · not redeemed yet
          </span>
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Gift card ID: {issued.id}
        </p>

        <button
          type="button"
          onClick={resetFlow}
          className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
        >
          Spend at another store
        </button>
      </div>
    );
  }

  if (step === "confirm" && selectedStore) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-600" />
          Confirm gift card
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review before we issue your wiCode and deduct points.
        </p>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Retailer</dt>
            <dd className="font-medium text-gray-900 dark:text-white text-right">
              {selectedStore.name}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Category</dt>
            <dd className="font-medium text-gray-900 dark:text-white text-right">
              {activeTab.label}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Gift card value</dt>
            <dd className="font-medium text-gray-900 dark:text-white text-right">
              R {amountNum.toFixed(2)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Points to spend</dt>
            <dd className="font-medium text-amber-700 dark:text-amber-400 text-right">
              {pointsCost.toLocaleString()} pts
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Balance after</dt>
            <dd className="font-medium text-gray-900 dark:text-white text-right">
              {(pointsBalance - pointsCost).toLocaleString()} pts
            </dd>
          </div>
          {matchedCampaign && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Yoyo campaign</dt>
              <dd className="text-xs text-gray-700 dark:text-gray-300 text-right max-w-[60%]">
                {matchedCampaign.name ?? matchedCampaign.id}
              </dd>
            </div>
          )}
        </dl>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mobile (optional — WhatsApp / SMS)
          </label>
          <input
            type="tel"
            value={mobileInput}
            onChange={(e) => setMobileInput(e.target.value)}
            placeholder="27790415295"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            International format, no + or spaces (SA: 27 then 9 digits). Leave blank to
            receive wiCode in the app only.
          </p>
          {mobileInput.trim() && !isValidYoyoMobileNumber(mobileInput) && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {profilePhone && !formatYoyoMobileNumber(profilePhone)
                ? "Your profile number is not a valid SA mobile — enter a ZA number or leave blank."
                : "Not a valid SA mobile — we will issue without SMS."}
            </p>
          )}
          {validMobile && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Will send to {validMobile}
            </p>
          )}
        </div>

        {selectedStore.apiOnly && (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg">
            This retailer uses API-only vouchers (no breakage). Issuance still works via
            Yoyo.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Issuing…
              </>
            ) : (
              "Confirm & generate gift card"
            )}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep("browse")}
            className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-600" />
            Spend points — Yoyo retail network
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Choose a store from our April 2026 footprint, enter an amount, then confirm to
            receive one gift card (wiCode).
          </p>
        </div>
      </div>

      {campaignsLoading && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading Yoyo campaigns…
        </p>
      )}
      {campaignsError && (
        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {campaignsError} — sandbox may still issue with default campaign when you confirm.
        </p>
      )}

      {/* Tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
        role="tablist"
      >
        {RETAIL_FOOTPRINT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTabId}
            onClick={() => {
              setActiveTabId(tab.id);
              setSelectedStore(null);
              setSearch("");
            }}
            className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              tab.id === activeTabId
                ? "bg-amber-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Product-specific vouchers · QR at till where supported ·{" "}
        {POINTS_PER_RAND} points = R1
      </p>

      {activeTab.id === "coming-soon" ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-500">
          More retailers coming soon.
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores in this category…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredStores.map((store) => {
              const selected = selectedStore?.id === store.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelectedStore(store)}
                  disabled={store.apiOnly}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selected
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500"
                      : "border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700"
                  } ${store.apiOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {store.name}
                  </span>
                  {store.storeCount != null && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {store.storeCount.toLocaleString()} stores
                    </span>
                  )}
                  {store.apiOnly && (
                    <span className="block text-xs text-amber-700 dark:text-amber-400">
                      API-only (contact support)
                    </span>
                  )}
                </button>
              );
            })}
            {filteredStores.length === 0 && (
              <p className="col-span-2 text-sm text-gray-500 py-4 text-center">
                No stores match your search.
              </p>
            )}
          </div>

          {selectedStore && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Selected: {selectedStore.name}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (Rands)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amountRand}
                  onChange={(e) => {
                    setAmountRand(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {amountNum > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    = {pointsCost.toLocaleString()} points · you have{" "}
                    {pointsBalance.toLocaleString()}
                  </p>
                )}
              </div>

              {amountNum > 0 && pointsCost > pointsBalance && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Not enough points for R {amountNum.toFixed(2)}.
                </p>
              )}

              {matchedCampaign && amountNum > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Campaign: {matchedCampaign.name ?? matchedCampaign.id}
                </p>
              )}

              <button
                type="button"
                disabled={!canProceed}
                onClick={openConfirm}
                className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Gift className="h-4 w-4" />
                Generate gift card
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
