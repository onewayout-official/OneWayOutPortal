"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { User, ChevronDown, LogOut } from "lucide-react";
import { storage } from "@/lib/storage";
import { rewards } from "@/lib/gamification/rewards";
import { REWARD_POINTS_UPDATED_EVENT } from "@/lib/gamification/rewardPoints";
import { getLocalDateString, isTaskCompleted } from "@/lib/gamification/config";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/types";

const financialAdvisorAppointmentKey = (userId: string) =>
  `onewayout-financial-advisor-appointed:${userId}`;

interface TopBarData {
  profile: UserProfile | null;
  rewardTotalPoints: number;
  rewardTodayPoints: number;
  hasAppointedFinancialAdvisor: boolean;
}

interface CachedTopBarData {
  userId: string;
  dateKey: string;
  loadedAt: number;
  data: TopBarData;
}

const defaultTopBarData: TopBarData = {
  profile: null,
  rewardTotalPoints: 0,
  rewardTodayPoints: 0,
  hasAppointedFinancialAdvisor: false,
};

let topBarDataCache: CachedTopBarData | null = null;

const ROUTE_REFRESH_MS = 60 * 1000;
const POLL_MS = 5 * 60 * 1000;
const topBarDataCacheKey = (userId: string) => `onewayout-dashboard-topbar:${userId}`;

function getCachedTopBarEntry(userId?: string): CachedTopBarData | null {
  if (!userId) return null;

  const today = getLocalDateString();
  if (topBarDataCache?.userId === userId && topBarDataCache.dateKey === today) {
    return topBarDataCache;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(topBarDataCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedTopBarData;
    if (parsed.userId !== userId || parsed.dateKey !== today) return null;

    topBarDataCache = {
      ...parsed,
      loadedAt: Number(parsed.loadedAt ?? 0),
    };
    return topBarDataCache;
  } catch {
    return null;
  }
}

function getCachedTopBarData(userId?: string): TopBarData | null {
  return getCachedTopBarEntry(userId)?.data ?? null;
}

function shouldRefreshTopBarData(userId: string, maxAgeMs: number) {
  const cached = getCachedTopBarEntry(userId);
  return !cached || Date.now() - cached.loadedAt >= maxAgeMs;
}

function setCachedTopBarData(userId: string, data: TopBarData) {
  const cacheEntry: CachedTopBarData = {
    userId,
    dateKey: getLocalDateString(),
    loadedAt: Date.now(),
    data,
  };

  topBarDataCache = cacheEntry;

  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(topBarDataCacheKey(userId), JSON.stringify(cacheEntry));
  } catch {
    // Cache failures should not block rendering fresh data.
  }
}

export default function DashboardTopBar() {
  const pathname = usePathname();
  const { logout, user: authUser, isCounselor } = useAuth();
  const cachedTopBarData = getCachedTopBarData(authUser?.userId);

  const [topBarData, setTopBarData] = useState<TopBarData>(
    cachedTopBarData ?? defaultTopBarData
  );
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferMethod, setTransferMethod] = useState("");
  const [transferInput, setTransferInput] = useState("");
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authUser?.userId) return;

    let cancelled = false;
    const userId = authUser.userId;

    const loadTopBarData = async () => {
      try {
        const localAppointmentRecorded =
          typeof window !== "undefined" &&
          localStorage.getItem(financialAdvisorAppointmentKey(userId)) === "1";

        const todayStr = getLocalDateString();
        const userProfile = await storage.getProfile();

        if (userProfile?.role === "counselor") {
          const nextTopBarData = {
            ...defaultTopBarData,
            profile: userProfile,
          };
          setTopBarData(nextTopBarData);
          setCachedTopBarData(userId, nextTopBarData);
          return;
        }

        const [gamification, totalPoints, todayPoints] = await Promise.all([
          rewards.getGamificationState(todayStr),
          rewards.getRewardTotalPoints(),
          rewards.getRewardTodayPoints(todayStr),
        ]);

        if (cancelled) return;

        const nextTopBarData = {
          profile: userProfile,
          rewardTotalPoints: totalPoints,
          rewardTodayPoints: todayPoints,
          hasAppointedFinancialAdvisor:
            localAppointmentRecorded ||
            isTaskCompleted("appoint-financial-advisor", gamification.completedTaskKeys),
        };

        setTopBarData(nextTopBarData);
        setCachedTopBarData(userId, nextTopBarData);
      } catch (error) {
        console.error("Failed to load top bar data:", error);
      }
    };

    if (shouldRefreshTopBarData(userId, ROUTE_REFRESH_MS)) {
      loadTopBarData();
    } else {
      const cached = getCachedTopBarData(userId);
      if (cached) {
        void Promise.resolve().then(() => {
          if (!cancelled) setTopBarData(cached);
        });
      }
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const schedulePoll = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (!cancelled) loadTopBarData();
      }, POLL_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (shouldRefreshTopBarData(userId, ROUTE_REFRESH_MS)) {
          loadTopBarData();
        }
        schedulePoll();
      } else if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    schedulePoll();
    document.addEventListener("visibilitychange", handleVisibility);

    const handlePointsUpdated = () => {
      if (!cancelled) void loadTopBarData();
    };
    window.addEventListener(REWARD_POINTS_UPDATED_EVENT, handlePointsUpdated);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(REWARD_POINTS_UPDATED_EVENT, handlePointsUpdated);
    };
  }, [authUser?.userId, pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { profile, rewardTotalPoints, rewardTodayPoints, hasAppointedFinancialAdvisor } = topBarData;
  const isCoachTopBar = isCounselor || profile?.role === "counselor";
  const firstName = profile?.name?.split(" ")[0] || "there";
  const availableBalance = rewardTotalPoints / 100;
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-5 border-b border-[#254e52] bg-[#2f6064]/95 px-4 pb-3 pt-4 shadow-lg shadow-black/10 backdrop-blur md:-mx-8 md:-mt-8 md:mb-8 md:bg-[#2f6064] md:px-8 md:pb-4 md:pt-8 md:shadow-none">
        <div className="relative flex min-h-12 items-center justify-center md:grid md:min-h-0 md:grid-cols-3 md:items-center md:gap-4">
          <div className={`${isCoachTopBar ? "mt-1 flex" : "hidden"} min-w-0 flex-col gap-0.5 rounded-xl bg-white/10 p-3 md:mt-0 md:flex md:flex-row md:flex-wrap md:items-center md:justify-start md:gap-3 md:bg-transparent md:p-0`}>
            {isCoachTopBar ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Coach Portal</span>
                <span className="text-base font-bold text-white">Session Dashboard</span>
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Appointments and client bookings</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">MY 1-Community Savings</span>
                  <span className="text-base font-bold text-white">R 0.00</span>
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Updated Quarterly</span>
                </div>
                {!hasAppointedFinancialAdvisor && (
                  <div className="hidden flex-col items-start gap-1 md:flex">
                    <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wide leading-none">
                      Supercharge your points
                    </span>
                    <Link
                      href="/consent"
                      className="flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 transition-colors text-left shrink-0"
                    >
                      <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wide leading-none">Appoint</span>
                      <span className="text-[11px] font-bold text-white leading-snug whitespace-nowrap">
                        &ldquo;OneWayOut&rdquo; as your
                      </span>
                      <span className="text-[10px] font-medium text-white/90 leading-snug whitespace-nowrap">
                        Financial Adviser
                      </span>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-col items-center justify-center md:col-span-1">
            <Image
              src="/logo.png"
              alt="OneWayOut logo"
              width={180}
              height={64}
              priority
              className="h-8 w-auto object-contain drop-shadow-sm md:h-12 md:drop-shadow-none"
            />
            <p className="mt-0.5 hidden text-xs text-white/60 sm:block">{todayFormatted}</p>
          </div>

          <div className={`${isCoachTopBar ? "mt-1 flex min-w-0 flex-col items-start rounded-xl bg-white/10 p-3" : "contents"} md:mt-0 md:flex md:min-w-0 md:flex-row md:flex-nowrap md:items-center md:justify-end md:gap-3 md:bg-transparent md:p-0`}>
            {!isCoachTopBar && (
              <>
                <div className="hidden flex-col items-end gap-0.5 border-r border-white/20 pr-3 md:flex">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Rewards Tracker</span>
                  <div className="flex flex-col items-end mt-0.5">
                    <span className="text-[11px] text-white/80">
                      Total Points: <span className="font-bold text-white">{rewardTotalPoints.toLocaleString()}</span>
                    </span>
                    <span className="text-[11px] text-white/80">
                      Today&apos;s Points: <span className="font-bold text-white">{rewardTodayPoints.toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <div className="hidden min-w-0 flex-col items-start md:flex md:items-end">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">My 1-Wallet</span>
                  <span className="text-sm font-bold text-white md:text-base">Balance: R {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm font-bold text-white/80 md:text-base">
                    Available: R {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => { setShowTransfer(true); setTransferMethod(""); setTransferInput(""); }}
                    className="mt-1.5 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    ⇄ Quick Transfer
                  </button>
                </div>
              </>
            )}

            <div className="absolute right-0 top-1/2 -translate-y-1/2 md:relative md:right-auto md:top-auto md:translate-y-0" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1 rounded-full p-1.5 transition-colors hover:bg-white/10 md:p-2"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/15 shadow-sm md:h-9 md:w-9 md:border-0 md:bg-white/20 md:shadow-none">
                  <User className="h-5 w-5 text-white" />
                </div>
                <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-50">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Hi, {firstName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTransfer && !isCoachTopBar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Quick Transfer</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">How would you like to send?</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Send to</label>
                <select
                  value={transferMethod}
                  onChange={(e) => { setTransferMethod(e.target.value); setTransferInput(""); }}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
                >
                  <option value="">— Select option —</option>
                  <option value="number">Enter number</option>
                  <option value="contact">Select from contact list</option>
                </select>
              </div>

              {transferMethod === "number" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Phone / Account number</label>
                  <input
                    autoFocus
                    type="text"
                    value={transferInput}
                    onChange={(e) => setTransferInput(e.target.value)}
                    placeholder="e.g. +264 81 234 5678"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
                  />
                </div>
              )}

              {transferMethod === "contact" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Contact</label>
                  <select
                    autoFocus
                    value={transferInput}
                    onChange={(e) => setTransferInput(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2f6064]"
                  >
                    <option value="">— Select contact —</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1.5 italic">No contacts saved yet.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                disabled={!transferMethod || (transferMethod === "number" && !transferInput.trim())}
                onClick={() => setShowTransfer(false)}
                className="flex-1 py-2.5 bg-[#2f6064] hover:bg-[#254e52] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowTransfer(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
