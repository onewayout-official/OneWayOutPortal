import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  GraduationCap,
  Star,
  Video,
  Heart,
  Calculator,
  Smile,
  LogIn,
  Receipt,
  Trophy,
  Users,
  Link2,
  ClipboardCheck,
  Briefcase,
} from "lucide-react";

/** Shown in UI fallbacks; actual onboarding award is 1,500 via RPC */
export const ONBOARDING_BONUS_POINTS = 1500;
export const SIGNUP_BONUS_POINTS = ONBOARDING_BONUS_POINTS;
export const SPIN_COST_POINTS = 50;
export const VIDEO_QUIZ_DAILY_CAP = 3;

/** Brand teal for spin wheel */
export const SPIN_WHEEL_BRAND = "#2f6064";

export const SPIN_WHEEL_SEGMENTS = [
  { points: 10, weight: 40, color: SPIN_WHEEL_BRAND },
  { points: 25, weight: 25, color: SPIN_WHEEL_BRAND },
  { points: 50, weight: 20, color: SPIN_WHEEL_BRAND },
  { points: 100, weight: 10, color: SPIN_WHEEL_BRAND },
  { points: 250, weight: 4, color: SPIN_WHEEL_BRAND },
  { points: 500, weight: 1, color: SPIN_WHEEL_BRAND },
] as const;

export type GamificationTaskId =
  | "daily-login"
  | "daily-mood"
  | "expense-log"
  | "video-quiz"
  | "counselling-session"
  | "counselling-reflection"
  | "plan-line-item"
  | "plan-section-complete"
  | "full-plan-complete"
  | "monthly-budget-update"
  | "monthly-expenses-update"
  | "monthly-review-complete"
  | "month-ended-green"
  | "month-ended-red-logged"
  | "tier-promotion"
  | "transunion-connection"
  | "astute-connection"
  | "buddy-mentor-session"
  | "onboarding-complete"
  | "leave-feedback"
  | "register-webinar"
  | "book-life-counseling"
  | "book-financial-planning"
  | "connect-transunion-astute"
  | "appoint-financial-advisor"
  | "report-abuse";

export type SpinMode = "free" | "token" | "paid";

export interface PointsRule {
  id: GamificationTaskId;
  activity: string;
  basePoints: number | string;
  notes: string;
}

/** Authoritative points catalog (product spec) */
export const POINTS_CATALOG: PointsRule[] = [
  { id: "daily-login", activity: "Daily app login", basePoints: 10, notes: "Triggers Spin the Wallet" },
  { id: "daily-mood", activity: "Mood check-in", basePoints: 20, notes: "Daily; no gating on mood value" },
  { id: "expense-log", activity: "Expense log (per day)", basePoints: 30, notes: "Feeds live budget tracker" },
  {
    id: "video-quiz",
    activity: "Watch educational video + pass quiz",
    basePoints: 100,
    notes: `Per content unit; daily cap of ${VIDEO_QUIZ_DAILY_CAP}`,
  },
  {
    id: "counselling-session",
    activity: "Counselling session attended",
    basePoints: 500,
    notes: "+50 for post-session reflection",
  },
  {
    id: "counselling-reflection",
    activity: "Post-session reflection",
    basePoints: 50,
    notes: "After counselling session",
  },
  {
    id: "plan-line-item",
    activity: "Plan line item entered (Tier 1 → 4)",
    basePoints: "50–300",
    notes: "Scales with complexity",
  },
  {
    id: "plan-section-complete",
    activity: "Plan section complete (one-time per section)",
    basePoints: "500–1,000",
    notes: "Income/expenses 500; assets/liabilities 1,000",
  },
  {
    id: "full-plan-complete",
    activity: "Full plan complete (one-time)",
    basePoints: 5000,
    notes: "Triggers Tier Confirmation Day",
  },
  {
    id: "monthly-budget-update",
    activity: "Monthly plan/budget update",
    basePoints: 500,
    notes: "Recurring monthly maintenance",
  },
  {
    id: "monthly-review-complete",
    activity: "Monthly review completed",
    basePoints: 1500,
    notes: "Plus 1 Wisdom",
  },
  {
    id: "month-ended-green",
    activity: "Month ended green (within budget)",
    basePoints: 2000,
    notes: "Bonus for hitting the plan",
  },
  {
    id: "month-ended-red-logged",
    activity: "Month ended red but fully logged",
    basePoints: 1000,
    notes: "Reward tracking honesty when budget exceeded",
  },
  {
    id: "tier-promotion",
    activity: "Tier promotion bonus",
    basePoints: "2,000–10,000",
    notes: "Scales by tier; one-time per tier",
  },
  {
    id: "transunion-connection",
    activity: "Transunion connection (Day 1)",
    basePoints: 1500,
    notes: "One-time; auto-populates liabilities",
  },
  {
    id: "astute-connection",
    activity: "Astute connection (advisor appointed)",
    basePoints: 3000,
    notes: "One-time; triggers Phase 2",
  },
  {
    id: "buddy-mentor-session",
    activity: "Buddy/mentor interaction (Legacy Builder)",
    basePoints: 200,
    notes: "Per session; capped weekly",
  },
  {
    id: "onboarding-complete",
    activity: "First-time onboarding completion",
    basePoints: 1500,
    notes: "Front-load the dopamine",
  },
];

export type TaskCategory = "daily" | "monthly" | "as-required";

export interface GamificationTask {
  id: GamificationTaskId;
  label: string;
  points: number | null;
  pointsLabel?: string;
  icon: LucideIcon;
  href?: string;
  autoAward?: boolean;
  manualClaim?: boolean;
  showOnEarn?: boolean;
  category?: TaskCategory;
}

export const GAMIFICATION_TASKS: GamificationTask[] = [
  {
    id: "daily-login",
    label: "Daily app login",
    points: 10,
    icon: LogIn,
    autoAward: true,
    showOnEarn: true,
    category: "daily",
  },
  {
    id: "daily-mood",
    label: "Mood check-in",
    points: 20,
    icon: Smile,
    href: "/mood",
    autoAward: true,
    showOnEarn: true,
    category: "daily",
  },
  {
    id: "expense-log",
    label: "Log Today's Expenses",
    points: 30,
    icon: Receipt,
    href: "/budget",
    autoAward: true,
    showOnEarn: true,
    category: "daily",
  },
  {
    id: "video-quiz",
    label: "Educational Video and Quiz",
    points: 100,
    pointsLabel: `100 each (max ${VIDEO_QUIZ_DAILY_CAP}/day)`,
    icon: GraduationCap,
    href: "/course",
    manualClaim: true,
    showOnEarn: true,
    category: "daily",
  },
  {
    id: "monthly-budget-update",
    label: "Monthly Income Update",
    points: 500,
    icon: Wallet,
    href: "/income",
    autoAward: true,
    showOnEarn: true,
    category: "monthly",
  },
  {
    id: "monthly-expenses-update",
    label: "Monthly Expenses Update",
    points: 500,
    icon: Receipt,
    href: "/expenses",
    autoAward: true,
    showOnEarn: true,
    category: "monthly",
  },
  {
    id: "monthly-review-complete",
    label: "Last Month Budget Review",
    points: 1500,
    icon: ClipboardCheck,
    showOnEarn: true,
    category: "monthly",
  },
  {
    id: "onboarding-complete",
    label: "Complete onboarding",
    points: 1500,
    icon: Trophy,
    href: "/onboarding",
    autoAward: true,
    showOnEarn: false,
    category: "as-required",
  },
  {
    id: "book-life-counseling",
    label: "Book Life Coaching Session",
    points: 500,
    pointsLabel: "500 (+50 reflection)",
    icon: Heart,
    href: "/help-me",
    showOnEarn: true,
    category: "monthly",
  },
  {
    id: "book-financial-planning",
    label: "Book Financial Planning Session",
    points: null,
    icon: Calculator,
    href: "/book-financial-session",
    showOnEarn: true,
    category: "monthly",
  },
  {
    id: "connect-transunion-astute",
    label: "Connect Transunion & Astute",
    points: 4500,
    pointsLabel: "1,500 + 3,000 pts",
    icon: Link2,
    showOnEarn: true,
    category: "as-required",
  },
  {
    id: "leave-feedback",
    label: "Leave Verified Feedback",
    points: null,
    icon: Star,
    showOnEarn: true,
    category: "as-required",
  },
  {
    id: "register-webinar",
    label: "Register for Webinar",
    points: null,
    icon: Video,
    href: "/course",
    showOnEarn: true,
    category: "as-required",
  },
  {
    id: "appoint-financial-advisor",
    label: "Appoint OneWayOut As Financial Intermediary/Advisor",
    points: 10000,
    icon: Briefcase,
    href: "/consent",
    showOnEarn: true,
    category: "as-required",
  },
  {
    id: "transunion-connection",
    label: "Connect Transunion",
    points: 1500,
    icon: Link2,
    showOnEarn: false,
    category: "as-required",
  },
  {
    id: "astute-connection",
    label: "Connect Astute advisor",
    points: 3000,
    icon: Users,
    showOnEarn: false,
    category: "as-required",
  },
  { id: "report-abuse", label: "Report Abuse", points: null, icon: Star, showOnEarn: false, category: "as-required" },
];

export const EARN_SCREEN_TASKS = GAMIFICATION_TASKS.filter((t) => t.showOnEarn !== false);

export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthKey(localDate: string): string {
  return localDate.slice(0, 7);
}

function getIsoWeekKey(localDate: string): string {
  const d = new Date(`${localDate}T12:00:00`);
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const year = thursday.getFullYear();
  const week = Math.ceil(
    ((thursday.getTime() - new Date(year, 0, 4).getTime()) / 86400000 + 4) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function isTaskCompleted(
  taskId: GamificationTaskId,
  completedKeys: string[],
  localDate = getLocalDateString()
): boolean {
  const date = localDate;
  const month = getMonthKey(date);

  switch (taskId) {
    case "daily-login":
      return completedKeys.includes(`daily-login-${date}`);
    case "daily-mood":
      return completedKeys.includes(`daily-mood-${date}`);
    case "expense-log":
      return completedKeys.includes(`expense-log-${date}`);
    case "video-quiz": {
      const prefix = `video-quiz-${date}-`;
      return completedKeys.filter((k) => k.startsWith(prefix)).length >= VIDEO_QUIZ_DAILY_CAP;
    }
    case "monthly-budget-update":
      return completedKeys.includes(`monthly-budget-update-${month}`);
    case "monthly-expenses-update":
      return completedKeys.includes(`monthly-expenses-update-${month}`);
    case "monthly-review-complete":
      return completedKeys.includes(`monthly-review-${month}`);
    case "month-ended-green":
      return completedKeys.includes(`month-ended-green-${month}`);
    case "month-ended-red-logged":
      return completedKeys.includes(`month-ended-red-${month}`);
    case "buddy-mentor-session":
      return completedKeys.some((k) => k.startsWith(`buddy-mentor-${getIsoWeekKey(date)}`));
    case "tier-promotion":
      return completedKeys.some((k) => k.startsWith("tier-promotion-"));
    case "connect-transunion-astute":
      return (
        completedKeys.includes("transunion-connection") &&
        completedKeys.includes("astute-connection")
      );
    case "appoint-financial-advisor":
    case "onboarding-complete":
    case "full-plan-complete":
    case "transunion-connection":
    case "astute-connection":
      return completedKeys.includes(taskId);
    default:
      return completedKeys.includes(taskId);
  }
}

export function formatPointsDisplay(points: number | null, pointsLabel?: string): string {
  if (pointsLabel) return pointsLabel;
  if (points === null) return "";
  return `${points.toLocaleString()} pts`;
}
