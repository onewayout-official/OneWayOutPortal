"use client";

import { useState, useEffect, useRef } from "react";
import { UserProfile, Asset } from "@/types";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { Calendar, DollarSign, Wallet, ChevronLeft, ChevronRight, HelpCircle, ShoppingCart, FileText, TrendingUp, TrendingDown, Smile, User, ChevronDown, LogOut, Shield, Crown, Building2, Gem, Check } from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar as ReBar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend as ReLegend, ResponsiveContainer,
} from 'recharts';

const COUNSELORS = [
  { name: "Sarah Mitchell", title: "Financial Counselor", specialty: "Debt Management & Budgeting", bio: "Expert guidance on eliminating debt and building healthy spending habits tailored to your lifestyle.", img: 5 },
  { name: "James Okonkwo", title: "Investment Advisor", specialty: "Wealth Building & Investments", bio: "Helping clients grow long-term wealth through diversified investment strategies and financial planning.", img: 11 },
  { name: "Priya Sharma", title: "Savings Strategist", specialty: "Emergency Funds & Savings", bio: "Specialising in building safety nets and achieving short-term savings goals that last.", img: 44 },
  { name: "Michael Torres", title: "Retirement Planner", specialty: "Retirement & Legacy Planning", bio: "Focused on securing your future with smart retirement strategies and long-term legacy building.", img: 15 },
  { name: "Amara Diallo", title: "Budget Coach", specialty: "Income Optimisation", bio: "Helping you stretch every dollar further with practical budgeting techniques that actually work.", img: 21 },
  { name: "David Chen", title: "Tax Consultant", specialty: "Tax Planning & Efficiency", bio: "Reducing your tax burden legally while maximising the money that stays in your pocket.", img: 25 },
  { name: "Natasha Williams", title: "Wealth Manager", specialty: "High Net Worth Planning", bio: "Tailored strategies for growing and protecting significant wealth across multiple asset classes.", img: 48 },
  { name: "Robert Nakamura", title: "Credit Advisor", specialty: "Credit Repair & Building", bio: "Rebuilding credit scores and establishing healthy credit habits for a stronger financial future.", img: 32 },
  { name: "Fatima Al-Hassan", title: "Financial Educator", specialty: "Financial Literacy", bio: "Empowering clients with foundational knowledge to make confident, informed financial decisions.", img: 64 },
  { name: "Marcus Johnson", title: "Investment Coach", specialty: "Stocks, ETFs & Index Funds", bio: "Breaking down investment options into clear, actionable steps for first-time and seasoned investors.", img: 38 },
  { name: "Elena Petrov", title: "Estate Planner", specialty: "Estate & Inheritance Planning", bio: "Ensuring your assets are protected and distributed according to your wishes for generations to come.", img: 47 },
  { name: "Samuel Boateng", title: "Business Finance Advisor", specialty: "Entrepreneurship & SME Finance", bio: "Supporting small business owners with financial strategies to grow, sustain, and scale their ventures.", img: 12 },
];

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [monthlyMinimumPayments, setMonthlyMinimumPayments] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [selectedDateState, setSelectedDateState] = useState<Date>(new Date());
  const [onboardingData, setOnboardingData] = useState<{
    income: any[];
    expenses: any[];
    assets: any[];
    liabilities: any[];
  }>({ income: [], expenses: [], assets: [], liabilities: [] });

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [monthlyChartData, setMonthlyChartData] = useState<{ month: string; Income: number; Expenses: number; Surplus: number }[]>([]);
  const [moodDates, setMoodDates] = useState<Set<string>>(new Set());
  const [budgetDates, setBudgetDates] = useState<Set<string>>(new Set());
  const [accountBalance, setAccountBalance] = useState<{ allocated: number; budgeted: number; spent: number } | null>(null);
  const [userAccounts, setUserAccounts] = useState<{ id: string; accountType: string; name: string }[]>([]);
  const [accountTypeBalances, setAccountTypeBalances] = useState<{ type: string; total: number }[]>([]);
  const [pooledIncome, setPooledIncome] = useState(0);
  const [pooledExpenses, setPooledExpenses] = useState(0);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferMethod, setTransferMethod] = useState("");
  const [transferInput, setTransferInput] = useState("");
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const { logout } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
      // Single batched call: one auth check + 8 parallel table reads (faster than 8 separate getUserId + fetch)
      const data = await storage.getDashboardData();
      if (!data) return;

      const { profile: userProfile, expenses, debts, assets: loadedAssets, income: incomeRows, budgetExpenses: budgetExpenseRows, liabilities: liabilityRows, dailyMoods, onboarding, incomeAllocations, accountExpenseAllocations, accountTransfers, userAccounts: loadedAccounts } = data;
      setUserAccounts(loadedAccounts);

      // If profile missing (e.g. new user), ensure it exists via normal getProfile (upsert)
      if (!userProfile) {
        const fallbackProfile = await storage.getProfile();
        setProfile(fallbackProfile);
        return;
      }

      setProfile(userProfile);
      setAssets(loadedAssets);

      // Mirror BudgetManager's pooled calculations so cards reflect live data
      setPooledIncome(
        incomeRows.length > 0
          ? incomeRows.reduce((sum, i) => sum + (Number(i.personal) || 0), 0)
          : (userProfile.monthlyIncome ?? 0)
      );
      setPooledExpenses(
        budgetExpenseRows.length > 0
          ? budgetExpenseRows.reduce((sum, e) => sum + (Number(e.personal) || 0), 0)
          : (userProfile.lastExpenses ?? 0)
      );

      setMoodDates(new Set(dailyMoods.map((m) => m.date)));
      setBudgetDates(new Set(expenses.map((e) => e.date.slice(0, 10))));

      // Prefer normalized tables; fall back to legacy onboarding_data JSONB
      const incomeForCharts =
        incomeRows.length > 0
          ? incomeRows.map((i) => ({
            incomeType: i.category,
            source: i.type,
            name: i.name,
            personal: i.personal,
            total: i.personal,
            points: i.points,
          }))
          : (onboarding.income || []).map((i: any) => ({
            incomeType: i.incomeType,
            source: i.source,
            name: i.name,
            personal: i.personal,
            total: i.personal,
            points: i.points,
          }));

      const expensesForCharts =
        budgetExpenseRows.length > 0
          ? budgetExpenseRows.map((e) => ({
            expenseCategory: e.category,
            expenseType: e.type,
            name: e.name,
            personal: e.personal,
            total: e.personal,
            points: e.points,
          }))
          : (onboarding.expenses || []).map((e: any) => ({
            expenseCategory: e.expenseCategory,
            expenseType: e.expenseType,
            name: e.name,
            personal: e.personal,
            total: e.total ?? e.personal,
            points: e.points,
          }));

      const assetsForCharts =
        loadedAssets.length > 0
          ? loadedAssets.map((a) => ({
            expenses: a.category,
            expenseType: a.type,
            name: a.name,
            personal: a.personal,
            total: a.personal,
            points: a.points,
            interestRate: a.interestRate,
          }))
          : (onboarding.assets || []).map((a: any) => ({
            expenses: a.expenses,
            expenseType: a.expenseType,
            name: a.name,
            personal: a.personal,
            total: a.total ?? a.personal,
            points: a.points,
            interestRate: a.interestRate,
          }));

      const liabilitiesForCharts =
        liabilityRows.length > 0
          ? liabilityRows.map((l) => ({
            expenses: l.category,
            expenseType: l.type,
            name: l.name,
            personal: l.personal,
            total: l.personal,
            points: l.points,
            interestRate: l.interestRate,
          }))
          : (onboarding.liabilities || []).map((l: any) => ({
            expenses: l.expenses,
            expenseType: l.expenseType,
            name: l.name,
            personal: l.personal,
            total: l.total ?? l.personal,
            points: l.points,
            interestRate: l.interestRate,
          }));

      setOnboardingData({
        income: incomeForCharts,
        expenses: expensesForCharts,
        assets: assetsForCharts,
        liabilities: liabilitiesForCharts,
      });

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = expenses
        .filter((exp) => {
          const expDate = new Date(exp.date);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + exp.amount, 0);
      setTotalExpenses(monthlyExpenses);

      // Compute real per-account figures if the user has set up allocations
      const allocatedIncomeIds = new Set(incomeAllocations.map((a) => a.accountId ? a.incomeId : null).filter(Boolean));
      if (incomeAllocations.length > 0 && incomeRows.length > 0) {
        const allocatedIncomeTotal = incomeRows
          .filter((i) => allocatedIncomeIds.has(i.id))
          .reduce((s, i) => s + (Number(i.personal) || 0), 0);
        const totalBudgeted = accountExpenseAllocations.reduce((s, a) => s + a.amount, 0);
        const totalSpentFromAccounts = expenses
          .filter((exp) => {
            const d = new Date(exp.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && exp.accountId;
          })
          .reduce((s, e) => s + e.amount, 0);
        setAccountBalance({ allocated: allocatedIncomeTotal, budgeted: totalBudgeted, spent: totalSpentFromAccounts });
      } else {
        setAccountBalance(null);
      }

      // Mirror BudgetManager account balance math by account type:
      // income + transfer in - transfer out - spent - budgeted
      const incomeById = new Map(incomeRows.map((i) => [i.id, Number(i.personal) || 0]));
      const incomeByAccount = new Map<string, number>();
      for (const alloc of incomeAllocations) {
        const baseAmount = incomeById.get(alloc.incomeId) ?? 0;
        const flowAmount = alloc.amount > 0 ? alloc.amount : baseAmount;
        incomeByAccount.set(alloc.accountId, (incomeByAccount.get(alloc.accountId) ?? 0) + flowAmount);
      }

      const budgetedByAccount = new Map<string, number>();
      for (const alloc of accountExpenseAllocations) {
        budgetedByAccount.set(alloc.accountId, (budgetedByAccount.get(alloc.accountId) ?? 0) + (alloc.amount || 0));
      }

      const spentByAccount = new Map<string, number>();
      for (const exp of expenses) {
        const d = new Date(exp.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && exp.accountId) {
          spentByAccount.set(exp.accountId, (spentByAccount.get(exp.accountId) ?? 0) + (exp.amount || 0));
        }
      }

      const transferOutByAccount = new Map<string, number>();
      const transferInByAccount = new Map<string, number>();
      for (const t of accountTransfers) {
        transferOutByAccount.set(t.fromAccountId, (transferOutByAccount.get(t.fromAccountId) ?? 0) + (t.amount || 0));
        transferInByAccount.set(t.toAccountId, (transferInByAccount.get(t.toAccountId) ?? 0) + (t.amount || 0));
      }

      const typeTotals = new Map<string, number>();
      for (const acc of loadedAccounts) {
        const total =
          (incomeByAccount.get(acc.id) ?? 0) +
          (transferInByAccount.get(acc.id) ?? 0) -
          (transferOutByAccount.get(acc.id) ?? 0) -
          (spentByAccount.get(acc.id) ?? 0) -
          (budgetedByAccount.get(acc.id) ?? 0);
        typeTotals.set(acc.accountType, (typeTotals.get(acc.accountType) ?? 0) + total);
      }

      const orderedTypes = ["cash", "bank", "investment", "savings", "wallet"];
      const typeLabels: Record<string, string> = {
        cash: "Cash",
        bank: "Bank",
        investment: "Investment",
        savings: "Savings",
        wallet: "Wallet",
      };
      const balances = orderedTypes
        .filter((type) => typeTotals.has(type))
        .map((type) => ({ type: typeLabels[type] ?? type, total: typeTotals.get(type) ?? 0 }));
      setAccountTypeBalances(balances);

      // Build last-6-months data for the Income Statement line chart
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const chartMonths = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { year: d.getFullYear(), month: d.getMonth(), label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` };
      });
      // Prefer the live sum of all income-source rows; fall back to the profile cached value
      const monthlyInc =
        incomeRows.length > 0
          ? incomeRows.reduce((sum, i) => sum + (i.personal || 0), 0)
          : (userProfile.monthlyIncome || userProfile.lastIncome || 0);
      const chartData = chartMonths.map(({ year, month: m, label }) => {
        const exp = expenses
          .filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === year; })
          .reduce((s, e) => s + e.amount, 0);
        return { month: label, Income: monthlyInc, Expenses: exp, Surplus: monthlyInc - exp };
      });
      setMonthlyChartData(chartData);

      const totalDebtAmount = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
      const totalMinPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
      setTotalDebt(totalDebtAmount);
      setMonthlyMinimumPayments(totalMinPayments);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsDashboardLoading(false);
      }
    };

    loadData();
    // Poll every 5 minutes (fix #11 — was 15s causing excessive Supabase queries).
    // Use a cancelled flag to prevent stale closures from overlapping (fix #6).
    const POLL_MS = 5 * 60 * 1000;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const safeLoad = async () => {
      if (!cancelled) await loadData();
    };

    const schedulePoll = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(safeLoad, POLL_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        safeLoad();
        schedulePoll();
      } else if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    schedulePoll();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isDashboardLoading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Please set up your profile first.</p>
        <Link
          href="/profile"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Profile
        </Link>
      </div>
    );
  }

  const monthlyIncome = profile.monthlyIncome || 0;
  const availableAfterExpenses = monthlyIncome - totalExpenses - monthlyMinimumPayments;
  const savingsRate = monthlyIncome > 0 ? (availableAfterExpenses / monthlyIncome) * 100 : 0;

  // Total points from onboarding (count points only when personal > 0)
  const totalPoints = [
    ...(onboardingData.income || []),
    ...(onboardingData.expenses || []),
    ...(onboardingData.assets || []),
    ...(onboardingData.liabilities || []),
  ].reduce(
    (sum, entry) =>
      sum +
      (entry.personal > 0 ? (entry.points ?? 0) : 0),
    0
  );

  // Calculate progress values for each button
  // Mood: Based on financial health (0-100)
  const moodProgress = Math.max(0, Math.min(100, savingsRate + 50));

  // Earn: Based on income goal from onboarding
  const earnTarget = profile.incomeGoals || monthlyIncome * 1.2;
  const earnProgress = earnTarget > 0
    ? Math.min(100, ((profile.lastIncome || monthlyIncome) / earnTarget) * 100)
    : 0;

  // Budget: Based on budget adherence (expenses vs budget)
  const budgetTarget = monthlyIncome * 0.8; // 80% of income as budget
  const budgetProgress = budgetTarget > 0
    ? Math.min(100, ((profile.lastExpenses || totalExpenses) / budgetTarget) * 100)
    : 0;

  // Calendar setup
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const getDateStatus = (day: number): { mood: boolean; earned: boolean; budget: boolean } => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return {
      mood: moodDates.has(key),
      earned: false, // no dated earn log yet
      budget: budgetDates.has(key),
    };
  };

  const getDaysArray = () => {
    const days = [];
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const goToPrevious = () => {
    if (calendarView === "week") {
      setCurrentDate(new Date(year, month, currentDate.getDate() - 7));
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const goToNext = () => {
    if (calendarView === "week") {
      setCurrentDate(new Date(year, month, currentDate.getDate() + 7));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get week days for week view
  const getWeekDays = () => {
    const day = currentDate.getDate();
    const startOfWeek = new Date(year, month, day - currentDate.getDay());
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  // Ring with color portions: yellow = mood, red = earned, green = budget (each 120°)
  const DateCircle = ({ status }: { status: { mood: boolean; earned: boolean; budget: boolean } }) => {
    const { mood, earned, budget } = status;
    const r = 14;
    const circ = 2 * Math.PI * r;
    const segment = circ / 3; // 120° each
    const strokeWidth = 10;

    return (
      <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90" style={{ overflow: "visible" }}>
        {/* Base gray ring */}
        <circle
          cx="18" cy="18" r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-300 dark:text-gray-500"
        />
        {/* Mood segment (0–120°) - yellow */}
        {mood && (
          <circle cx="18" cy="18" r={r} fill="none" stroke="#eab308" strokeWidth={strokeWidth}
            strokeDasharray={`${segment} ${circ - segment}`} strokeDashoffset={0} strokeLinecap="round" />
        )}
        {/* Earned segment (120–240°) - red */}
        {earned && (
          <circle cx="18" cy="18" r={r} fill="none" stroke="#ef4444" strokeWidth={strokeWidth}
            strokeDasharray={`${segment} ${circ - segment}`} strokeDashoffset={-segment} strokeLinecap="round" />
        )}
        {/* Budget segment (240–360°) - green */}
        {budget && (
          <circle cx="18" cy="18" r={r} fill="none" stroke="#22c55e" strokeWidth={strokeWidth}
            strokeDasharray={`${segment} ${circ - segment}`} strokeDashoffset={-segment * 2} strokeLinecap="round" />
        )}
      </svg>
    );
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-2">
      {dayNames.map((day) => (
        <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
          {day}
        </div>
      ))}
      {getDaysArray().map((day, index) => {
        const date = day ? new Date(year, month, day) : null;
        const isToday = date && date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        const isSelected = date && date.getDate() === selectedDateState.getDate() &&
          date.getMonth() === selectedDateState.getMonth() && date.getFullYear() === selectedDateState.getFullYear();

        return (
          <div
            key={index}
            onClick={() => {
              if (date) {
                setSelectedDateState(date);
                setCurrentDate(date);
              }
            }}
            className={`text-center py-2 rounded-lg relative cursor-pointer min-h-[56px] flex flex-col items-center justify-center gap-1 transition-all ${day === null
              ? ""
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 " + (
                isToday && isSelected
                  ? "ring-2 ring-blue-500 bg-blue-100/60 dark:bg-blue-900/40 dark:ring-blue-400"
                  : isToday
                    ? "ring-2 ring-blue-400/70 bg-blue-50/50 dark:bg-blue-900/25 dark:ring-blue-500/60 font-medium"
                    : isSelected
                      ? "ring-2 ring-slate-400/60 bg-slate-100/80 dark:bg-slate-700/40 dark:ring-slate-500/60"
                      : ""
              )
              }`}
          >
            {day && (
              <>
                <span className="text-sm font-medium">{day}</span>
                <DateCircle status={getDateStatus(day)} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const isToday =
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();
            const isSelected =
              date.getDate() === selectedDateState.getDate() &&
              date.getMonth() === selectedDateState.getMonth() &&
              date.getFullYear() === selectedDateState.getFullYear();
            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedDateState(date);
                  setCurrentDate(date);
                }}
                className={`text-center py-2 rounded-lg cursor-pointer min-h-[60px] flex flex-col items-center justify-center gap-1 transition-all text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 ${isToday && isSelected
                  ? "ring-2 ring-blue-500 bg-blue-100/60 dark:bg-blue-900/40 dark:ring-blue-400"
                  : isToday
                    ? "ring-2 ring-blue-400/70 bg-blue-50/50 dark:bg-blue-900/25 dark:ring-blue-500/60 font-medium"
                    : isSelected
                      ? "ring-2 ring-slate-400/60 bg-slate-100/80 dark:bg-slate-700/40 dark:ring-slate-500/60"
                      : ""
                  }`}
              >
                <span className="text-sm font-medium">{date.getDate()}</span>
                <DateCircle status={getDateStatus(date.getDate())} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    if (calendarView === "week") {
      const weekDays = getWeekDays();
      const start = weekDays[0];
      const end = weekDays[6];
      return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${year}`;
    } else {
      return `${monthNames[month]} ${year}`;
    }
  };

  const firstName = profile?.name?.split(" ")[0] || "there";
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Dashboard Header - sticky */}
      <div className="sticky top-0 z-20 -mx-4 px-4 -mt-4 pt-4 md:-mx-8 md:px-8 md:-mt-8 md:pt-8 pb-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-3 items-center gap-4">

          {/* Left — OneWayOut Investment */}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ONE INVESTMENT</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {/*{totalPoints.toLocaleString()} Points*/}
             
            </span>
            <span className="text-base font-bold text-green-600 dark:text-green-400">
              {/*N${(profile.savingsGoal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*/}
              N$ 3,000
            </span>
          </div>

          {/* Center — Logo */}
          <div className="flex flex-col items-center justify-center">
            <Image
              src="/logo.png"
              alt="OneWayOut logo"
              width={180}
              height={64}
              priority
              className="h-10 md:h-12 w-auto object-contain"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{todayFormatted}</p>
          </div>

          {/* Right — Wallet + profile */}
          <div className="flex items-center justify-end gap-3">
            {/* Wallet info */}
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ONE WALLET</span>
              <span className="text-base font-bold text-green-600 dark:text-green-400">
              {/*N${(profile.savingsGoal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*/}
              Balance: N$ 3,000
              </span>

              <span className="text-base font-bold text-blue-600 dark:text-blue-400">
              Available: N$ 1,500
              </span>
              <button
                onClick={() => { setShowTransfer(true); setTransferMethod(""); setTransferInput(""); }}
                className="mt-1.5 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#2f6064] hover:bg-[#254e52] rounded-lg transition-colors"
              >
                ⇄ Quick Transfer
              </button>
              {/*accountBalance ? (
                <>
                  <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    Income N${accountBalance.allocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {accountBalance.budgeted > 0 && (
                    <span className="text-xs font-semibold text-orange-500">
                      Budgeted N${accountBalance.budgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {accountBalance.spent > 0 && (
                    <span className="text-xs font-semibold text-red-500">
                      Spent N${accountBalance.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  <span className={`text-sm font-bold ${Math.max(0, accountBalance.allocated - accountBalance.budgeted - accountBalance.spent) === 0 ? "text-gray-400" : "text-blue-600 dark:text-blue-400"}`}>
                    Available N${Math.max(0, accountBalance.allocated - accountBalance.budgeted - accountBalance.spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    Balance N${(profile.monthlyIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    Available N${Math.max(0, (profile.monthlyIncome || 0) - totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </>
              )}*/}
            </div>

            {/* Profile dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${profileDropdownOpen ? "rotate-180" : ""}`} />
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



      {/* Calendar */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevious}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {getViewTitle()}
              </h2>
            </div>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCalendarView("week")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${calendarView === "week"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView("month")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${calendarView === "month"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
            >
              Month
            </button>
          </div>

          <button
            onClick={goToToday}
            className="w-full mb-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go to Today
          </button>

          {/* Calendar View Content */}
          {calendarView === "month" && renderMonthView()}
          {calendarView === "week" && renderWeekView()}
        </div>
      </div>

      {/* Mood, Earn, Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Mood Card */}
        <Link href="/mood" className="block">
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-yellow-400 shadow-sm hover:bg-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors"
          >
            <div className="p-2 rounded-full bg-white/30">
              <Smile className="h-10 w-10" />
            </div>
            <div className="flex flex-col items-start text-gray-900 dark:text-gray-900">
              <span className="text-sm font-semibold">Mood</span>
              <span className="text-xs opacity-90">How are you feeling?</span>
            </div>
          </button>
        </Link>

        {/* Earn Card */}
        <Link href="/earn" className="block">
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-500 shadow-sm hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
          >
            <div className="p-2 rounded-full bg-white/30">
              <DollarSign className="h-10 w-10 text-white" />
            </div>
            <div className="flex flex-col items-start text-white">
              <span className="text-sm font-semibold">Earn</span>
              <span className="text-xs opacity-90">Grow your income</span>
            </div>
          </button>
        </Link>

        {/* Budget Card */}
        <Link href="/budget" className="block">
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-green-500 shadow-sm hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transition-colors"
          >
            <div className="p-2 rounded-full bg-white/30">
              <Wallet className="h-10 w-10" />
            </div>
            <div className="flex flex-col items-start text-gray-900 dark:text-gray-900">
              <span className="text-sm font-semibold">Budget</span>
              <span className="text-xs opacity-90">Control your spending</span>
            </div>
          </button>
        </Link>
      </div>

      {/* Three Action Buttons (card style, softer gradients distinct from top row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Help me Button */}
        <Link href="/help-me" className="block">
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 shadow-sm hover:from-amber-200 hover:to-yellow-200 dark:from-amber-200 dark:to-yellow-200 transition-colors"
          >
            <div className="p-2 rounded-full bg-amber-500 text-white">
              <HelpCircle className="h-10 w-10" />
            </div>
            <div className="flex flex-col items-start text-gray-900">
              <span className="text-sm font-semibold">Help me</span>
              <span className="text-xs opacity-90">Get guidance on next steps</span>
            </div>
          </button>
        </Link>

        {/* Spend Button */}
        <Link href="/spend" className="block">
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-rose-100 to-red-100 shadow-sm hover:from-rose-200 hover:to-red-200 dark:from-rose-200 dark:to-red-200 transition-colors"
          >
            <div className="p-2 rounded-full bg-rose-500 text-white">
              <ShoppingCart className="h-10 w-10" />
            </div>
            <div className="flex flex-col items-start text-gray-900">
              <span className="text-sm font-semibold">Spend</span>
              <span className="text-xs opacity-90">Track your daily expenses</span>
            </div>
          </button>
        </Link>

        {/* Review debt Button */}
        <Link href="/review-debt" className="block">
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-100 to-green-100 shadow-sm hover:from-emerald-200 hover:to-green-200 dark:from-emerald-200 dark:to-green-200 transition-colors"
          >
            <div className="p-2 rounded-full bg-emerald-500 text-white">
              <FileText className="h-10 w-10" />
            </div>
            <div className="flex flex-col items-start text-gray-900">
              <span className="text-sm font-semibold">Review debt</span>
              <span className="text-xs opacity-90">See what you owe today</span>
            </div>
          </button>
        </Link>
      </div>






      {/* Membership Levels Timeline */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2f6064]">OneWayOut</h2>
            <p className="text-sm text-gray-500 font-medium">Membership Levels</p>
          </div>
          <div className="hidden sm:block px-3 py-1 rounded-full bg-[#2f6064]/10 text-[#2f6064] text-xs font-bold uppercase tracking-wider">
            Current Tier: Debt Crusher
          </div>
        </div>

        <div className="relative">
          {/* Timeline Connector Line */}
          <div className="absolute top-10 left-0 w-full h-1 bg-gray-100 dark:bg-gray-700 -z-0" />
          <div className="absolute top-10 left-0 w-1/4 h-1 bg-emerald-500 -z-0" />

          <div className="grid grid-cols-4 gap-4 relative z-10">
            {/* Tier 1: Debt Crusher */}
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg ring-4 ring-white dark:ring-gray-800 mb-4">
                <Shield className="h-10 w-10" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">1. Debt Crusher</h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-2">In Arrears</p>
              <div className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/30 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-100 dark:border-emerald-800 flex items-center gap-1">
                <Check className="h-2.5 w-2.5" />
                Active Since Jan 2026
              </div>
            </div>

            {/* Tier 2: Cash King */}
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 shadow-md ring-4 ring-white dark:ring-gray-800 mb-4 transition-all hover:scale-105">
                <Crown className="h-10 w-10" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">2. Cash King</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Cash Savings</p>
              <div className="text-[10px] text-gray-400 font-medium italic">Anticipated: June 2026</div>
            </div>

            {/* Tier 3: Wealth Creator */}
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 shadow-md ring-4 ring-white dark:ring-gray-800 mb-4 transition-all hover:scale-105">
                <Building2 className="h-10 w-10" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">3. Wealth Creator</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Building</p>
              <div className="text-[10px] text-gray-400 font-medium italic">Target: Dec 2027</div>
            </div>

            {/* Tier 4: Legacy Builder */}
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 shadow-md ring-4 ring-white dark:ring-gray-800 mb-4 transition-all hover:scale-105">
                <Gem className="h-10 w-10" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">4. Legacy Builder</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Freedom</p>
              <div className="text-[10px] text-gray-400 font-medium italic">Vision: 2030+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Display — commented out, replaced by counselor slider below */}
      {/* {profile.onboardingCompleted && profile.mood && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Current Mood</h3>
          <div className="flex items-center gap-4">
            <div className="text-6xl">{profile.mood}</div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                {profile.mood === "😊" && "You're feeling great! Keep up the positive mindset."}
                {profile.mood === "😐" && "You're doing okay. Remember, progress takes time."}
                {profile.mood === "😔" && "Hang in there! Every step forward counts, no matter how small."}
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Financial Counselors */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meet Your Financial Counselors</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Browse our growing pool of expert advisors</p>
          </div>
          <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
            Bookings Opening Soon
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {COUNSELORS.slice(0, 3).map((counselor, idx) => (
            <div
              key={idx}
              className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex flex-col items-center text-center gap-3"
            >
              <img
                src={`https://i.pravatar.cc/150?img=${counselor.img}`}
                alt={counselor.name}
                className="w-14 h-14 rounded-full object-cover shadow-md ring-2 ring-white dark:ring-gray-600"
              />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{counselor.name}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{counselor.title}</p>
              </div>
              <span className="text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-700">
                {counselor.specialty}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{counselor.bio}</p>
              <button
                disabled
                className="mt-auto w-full text-xs font-medium py-1.5 px-3 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              >
                Book Free Session
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 w-full sm:w-auto text-sm font-medium py-2 px-4 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
        >
          View other counsellors
        </button>
      </div>

      {/* Cash is king Heading */}
      <div>
        <h3 className="text font-bold text-gray-900 dark:text-white">Cash is king - total cash balances</h3>
      </div>
      {accountTypeBalances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {accountTypeBalances.map((b) => (
            <div
              key={b.type}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">{b.type}</p>
              <p className={`text-xl font-bold ${b.total < 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                N${b.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Financial Overview Cards */}
      {profile.onboardingCompleted && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Capital / Assets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    N${(profile.capital || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Debts</p>
                  <p className="text-2xl font-bold text-orange-600">
                    N${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</p>
                  <p className="text-2xl font-bold text-blue-600">
                    N${pooledIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Planned Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    N${pooledExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>


        </>
      )}

      {/* Financial Profile Details */}
      {profile.onboardingCompleted && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Profile Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1 — Monthly Income Statement Summary (Line Chart) */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Monthly Income Statement Summary
              </h3>
              {/*<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Income · Expenses · Surplus — last 6 months</p>*/}
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => `N$${Math.abs(v).toLocaleString()}`}
                      axisLine={false}
                      tickLine={false}
                      padding={{ top: 20, bottom: 10 }}
                    />
                    <ReTooltip
                      formatter={(value: number | undefined, name: string | undefined) => [
                        `N$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                        name ?? '',
                      ]}
                    />
                    <ReLegend verticalAlign="bottom" />
                    <Line type="monotone" dataKey="Income" stroke="#92d050" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Expenses" stroke="#ff0000" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Surplus" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                  No data available yet
                </div>
              )}
            </div>


            {/* 2 — Financial Position (Summary Bar Chart) */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                Financial Position
              </h3>
              {/*<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Total Assets · Total Liabilities · Net Worth</p>*/}
              {(() => {
                const totalAssets = onboardingData.assets.reduce(
                  (sum: number, a: any) => sum + (a.personal ?? 0), 0
                );
                const totalLiabilities = onboardingData.liabilities.reduce(
                  (sum: number, l: any) => sum + (l.personal ?? 0), 0
                );
                const netWorth = totalAssets - totalLiabilities;

                const barData = [
                  { name: 'Total Assets', value: totalAssets, fill: '#92d050' },
                  { name: 'Total Liabilities', value: totalLiabilities, fill: '#ff0000' },
                  { name: 'Net Worth', value: netWorth, fill: netWorth >= 0 ? '#3b82f6' : '#ffc000' },
                ];

                const hasData = totalAssets > 0 || totalLiabilities > 0;

                return hasData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData} margin={{ top: 24, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickFormatter={(v) => `N$${Math.abs(v).toLocaleString()}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ReTooltip
                        formatter={(value: number | undefined) =>
                          [`N$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, '']
                        }
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      />
                      <ReBar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </ReBar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                    No asset or liability data available yet
                  </div>
                );
              })()}
            </div>


          </div>{/* end grid */}

        </div>
      )}

      {/* ── Quick Transfer modal ── */}
      {showTransfer && (
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
                    {/* Contact list to be populated */}
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
    </div>
  );
}

