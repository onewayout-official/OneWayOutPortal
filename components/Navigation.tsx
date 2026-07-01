"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, DollarSign, TrendingUp, TrendingDown, FileText, BarChart3, LogOut, Smile, Wallet, HelpCircle, ShoppingCart, Shield, GraduationCap, CalendarCheck, ClipboardList, UserCog, Eye, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { rewards } from "@/lib/gamification/rewards";
import { getLocalDateString, isTaskCompleted } from "@/lib/gamification/config";
import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types";

const financialAdvisorAppointmentKey = (userId: string) =>
  `onewayout-financial-advisor-appointed:${userId}`;

interface MobileFinancialData {
  profile: UserProfile | null;
  rewardTotalPoints: number;
  rewardTodayPoints: number;
  hasAppointedFinancialAdvisor: boolean;
}

interface CachedMobileFinancialData {
  userId: string;
  dateKey: string;
  loadedAt: number;
  data: MobileFinancialData;
}

const defaultMobileFinancialData: MobileFinancialData = {
  profile: null,
  rewardTotalPoints: 0,
  rewardTodayPoints: 0,
  hasAppointedFinancialAdvisor: false,
};

let mobileFinancialDataCache: CachedMobileFinancialData | null = null;

const MOBILE_FINANCIAL_REFRESH_MS = 60 * 1000;
const mobileFinancialDataCacheKey = (userId: string) =>
  `onewayout-dashboard-topbar:${userId}`;

function getCachedMobileFinancialEntry(userId?: string): CachedMobileFinancialData | null {
  if (!userId) return null;

  const today = getLocalDateString();
  if (mobileFinancialDataCache?.userId === userId && mobileFinancialDataCache.dateKey === today) {
    return mobileFinancialDataCache;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(mobileFinancialDataCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedMobileFinancialData;
    if (parsed.userId !== userId || parsed.dateKey !== today) return null;

    mobileFinancialDataCache = {
      ...parsed,
      loadedAt: Number(parsed.loadedAt ?? 0),
    };
    return mobileFinancialDataCache;
  } catch {
    return null;
  }
}

function getCachedMobileFinancialData(userId?: string): MobileFinancialData | null {
  return getCachedMobileFinancialEntry(userId)?.data ?? null;
}

function shouldRefreshMobileFinancialData(userId: string) {
  const cached = getCachedMobileFinancialEntry(userId);
  return !cached || Date.now() - cached.loadedAt >= MOBILE_FINANCIAL_REFRESH_MS;
}

function setCachedMobileFinancialData(userId: string, data: MobileFinancialData) {
  const cacheEntry: CachedMobileFinancialData = {
    userId,
    dateKey: getLocalDateString(),
    loadedAt: Date.now(),
    data,
  };

  mobileFinancialDataCache = cacheEntry;

  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(mobileFinancialDataCacheKey(userId), JSON.stringify(cacheEntry));
  } catch {
    // Cache failures should not block rendering fresh data.
  }
}

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
      { href: "/financial-plan", label: "Financial Information", icon: BarChart3 },
      { href: "/my-1-plan", label: "FNA", icon: ClipboardList },
      { href: "/book-financial-session", label: "Book Financial Planning Session", icon: CalendarCheck },
    ],
  },
  {
    label: "Actions",
    items: [
      { href: "/mood", label: "Mood", icon: Smile },
      { href: "/earn", label: "Earn", icon: DollarSign },
      { href: "/budget", label: "Budget", icon: Wallet },
      { href: "/help-me", label: "Help me", icon: HelpCircle },
      { href: "/course", label: "Course", icon: GraduationCap },
      { href: "/spend", label: "Spend", icon: ShoppingCart },
      { href: "/review-debt", label: "Review debt", icon: FileText },
    ],
  },
  
  {
    label: "My Money",
    items: [
      { href: "/income", label: "Income", icon: TrendingUp },
      { href: "/expenses", label: "Expenses", icon: TrendingDown },
      
    ],
  },
  {
    label: "My Net Worth",
    items: [
      { href: "/assets", label: "Assets", icon: DollarSign },
      
      { href: "/debts", label: "Debts", icon: FileText },
    ],
  },
  
  {
    label: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex w-full flex-row items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors ${
        isActive
          ? "bg-white/20 font-semibold"
          : "opacity-80 hover:bg-white/10 hover:opacity-100"
      } text-white`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { logout, isAdmin, isCoachesAdmin, user: authUser, isCounselor } = useAuth();
  const cachedFinancialData = getCachedMobileFinancialData(authUser?.userId);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [financialData, setFinancialData] = useState<MobileFinancialData>(
    cachedFinancialData ?? defaultMobileFinancialData
  );
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferMethod, setTransferMethod] = useState("");
  const [transferInput, setTransferInput] = useState("");

  const visibleSections = navSections.map((section) => {
    if (section.label !== "Account") return section;
    const items = [...section.items];
    if (isAdmin) items.push({ href: "/admin", label: "Admin", icon: Shield });
    if (isCoachesAdmin) {
      items.push({ href: "/admin/coaches", label: "Manage Coaches", icon: UserCog });
      items.push({ href: "/coach/demo", label: "Coach Demo", icon: Eye });
    }
    return { ...section, items };
  });

  useEffect(() => {
    if (!authUser?.userId) return;

    let cancelled = false;
    const userId = authUser.userId;

    const loadFinancialData = async () => {
      try {
        const localAppointmentRecorded =
          typeof window !== "undefined" &&
          localStorage.getItem(financialAdvisorAppointmentKey(userId)) === "1";
        const todayStr = getLocalDateString();
        const userProfile = await storage.getProfile();

        if (userProfile?.role === "counselor") {
          const nextFinancialData = {
            ...defaultMobileFinancialData,
            profile: userProfile,
          };
          setFinancialData(nextFinancialData);
          setCachedMobileFinancialData(userId, nextFinancialData);
          return;
        }

        const [gamification, txnsResult] = await Promise.all([
          rewards.getGamificationState(todayStr),
          supabase
            .from("reward_transactions")
            .select("points_delta, created_at")
            .eq("user_id", userId)
            .gt("points_delta", 0),
        ]);

        if (cancelled) return;

        const txns = txnsResult.data ?? [];
        const total = txns.reduce((sum, row) => sum + Number(row.points_delta), 0);
        const today = txns
          .filter((row) => row.created_at.slice(0, 10) === todayStr)
          .reduce((sum, row) => sum + Number(row.points_delta), 0);
        const nextFinancialData = {
          profile: userProfile,
          rewardTotalPoints: total,
          rewardTodayPoints: today,
          hasAppointedFinancialAdvisor:
            localAppointmentRecorded ||
            isTaskCompleted("appoint-financial-advisor", gamification.completedTaskKeys),
        };

        setFinancialData(nextFinancialData);
        setCachedMobileFinancialData(userId, nextFinancialData);
      } catch (error) {
        console.error("Failed to load mobile navigation financial data:", error);
      }
    };

    if (shouldRefreshMobileFinancialData(userId)) {
      loadFinancialData();
    } else {
      const cached = getCachedMobileFinancialData(userId);
      if (cached) {
        void Promise.resolve().then(() => {
          if (!cancelled) setFinancialData(cached);
        });
      }
    }

    return () => {
      cancelled = true;
    };
  }, [authUser?.userId, pathname]);

  const isCoachNav = isCounselor || financialData.profile?.role === "counselor";
  const availableBalance = financialData.rewardTotalPoints / 100;
  const formattedBalance = availableBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#2f6064] text-white shadow-lg md:hidden"
        aria-label="Open navigation menu"
        aria-expanded={isMobileMenuOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={`fixed inset-0 z-50 md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation menu"
        />

        <nav
          className={`relative flex h-full w-[min(20rem,85vw)] flex-col overflow-y-auto p-4 text-white shadow-2xl transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-[120%]"
          }`}
          style={{ backgroundColor: '#2f6064' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wide text-white/80">Menu</span>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!isCoachNav && (
            <div className="mb-5 space-y-3 rounded-2xl border border-white/15 bg-white/10 p-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">MY 1-Community Savings</span>
                <p className="mt-0.5 text-lg font-bold text-white">R 0.00</p>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Updated Quarterly</span>
              </div>

              <div className="border-t border-white/15 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Rewards Tracker</span>
                <div className="mt-1 space-y-0.5 text-xs text-white/80">
                  <p>Total Points: <span className="font-bold text-white">{financialData.rewardTotalPoints.toLocaleString()}</span></p>
                  <p>Today&apos;s Points: <span className="font-bold text-white">{financialData.rewardTodayPoints.toLocaleString()}</span></p>
                </div>
              </div>

              <div className="border-t border-white/15 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">My 1-Wallet</span>
                <p className="mt-1 text-sm font-bold text-white">Balance: R {formattedBalance}</p>
                <p className="text-sm font-bold text-white/80">Available: R {formattedBalance}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransfer(true);
                    setTransferMethod("");
                    setTransferInput("");
                    setIsMobileMenuOpen(false);
                  }}
                  className="mt-2 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/30"
                >
                  Quick Transfer
                </button>
              </div>

              {!financialData.hasAppointedFinancialAdvisor && (
                <Link
                  href="/consent"
                  className="block rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Appoint &quot;OneWayOut&quot; as your Financial Adviser
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {visibleSections.map((section) => (
              <div key={section.label}>
                <h3 className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#efc19e' }}>
                  {section.label}
                </h3>
                <div className="mt-1 flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={isActive}
                        onNavigate={() => setIsMobileMenuOpen(false)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4">
            <button
              onClick={logout}
              className="flex w-full flex-row items-center gap-3 rounded-lg border border-white/15 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      <nav className="hidden md:relative md:block md:min-h-screen md:text-white md:bg-transparent">
        {/* Desktop sidebar */}
        <div
          className="flex flex-col p-4 gap-6 h-full min-h-screen"
          style={{ backgroundColor: '#2f6064' }}
        >
        {visibleSections.map((section) => (
          <div key={section.label}>
            <h3 className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#efc19e' }}>
              {section.label}
            </h3>
            <div className="flex flex-col gap-0.5 mt-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout at bottom */}
        <div className="mt-auto pt-4 border-t border-white/20">
          <button
            onClick={logout}
            className="flex flex-row w-full items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-white/70 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
      </nav>

      {showTransfer && !isCoachNav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Quick Transfer</h2>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">How would you like to send?</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Send to</label>
                <select
                  value={transferMethod}
                  onChange={(e) => {
                    setTransferMethod(e.target.value);
                    setTransferInput("");
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2f6064] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">-- Select option --</option>
                  <option value="number">Enter number</option>
                  <option value="contact">Select from contact list</option>
                </select>
              </div>

              {transferMethod === "number" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Phone / Account number</label>
                  <input
                    autoFocus
                    type="text"
                    value={transferInput}
                    onChange={(e) => setTransferInput(e.target.value)}
                    placeholder="e.g. +264 81 234 5678"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2f6064] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {transferMethod === "contact" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Contact</label>
                  <select
                    autoFocus
                    value={transferInput}
                    onChange={(e) => setTransferInput(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2f6064] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- Select contact --</option>
                  </select>
                  <p className="mt-1.5 text-[11px] italic text-gray-400">No contacts saved yet.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={!transferMethod || (transferMethod === "number" && !transferInput.trim())}
                onClick={() => setShowTransfer(false)}
                className="flex-1 rounded-xl bg-[#2f6064] py-2.5 font-semibold text-white transition-colors hover:bg-[#254e52] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowTransfer(false)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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

