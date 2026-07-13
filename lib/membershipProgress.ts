import { getMembershipTierContent } from "@/lib/membershipTierContent";
import {
  DESKTOP_TIER_ANCHORS,
  journeyProgressAtTier,
} from "@/lib/membershipQuestPaths";
import { storage } from "@/lib/storage";
import { tryAwardTask } from "@/lib/gamification/rewards";
import type {
  DebtStatus,
  InvestmentStatus,
  MembershipTier,
  SavingsStatus,
  UserProfile,
} from "@/types";

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  "Debt Crusher",
  "Cash King",
  "Wealth Creator",
  "Legacy Builder",
];

export interface QuestStep {
  id: string;
  label: string;
  done: boolean;
  weight: number;
}

export interface MembershipProgress {
  currentTier: MembershipTier;
  currentTierIndex: number;
  nextTier: MembershipTier | null;
  tierProgress: number;
  journeyProgress: number;
  questSteps: QuestStep[];
  nextMilestoneTitle: string;
  nextMilestoneBody: string;
  memberSinceLabel: string;
}

export interface MembershipProgressContext {
  profile: UserProfile;
  totalDebt?: number;
  /** Cash, savings, and bank balances only — excludes gamification wallet points. */
  totalSavings?: number;
  investmentAssetTotal?: number;
}

function tierIndex(tier: MembershipTier): number {
  const i = MEMBERSHIP_TIERS.indexOf(tier);
  return i < 0 ? 0 : i;
}

function normalizeTier(membership?: MembershipTier): MembershipTier {
  if (membership && MEMBERSHIP_TIERS.includes(membership)) return membership;
  return "Debt Crusher";
}

function hasSavings(savingsStatus?: SavingsStatus, cashSavingsTotal = 0): boolean {
  return savingsStatus === "started" || savingsStatus === "growing" || cashSavingsTotal > 0;
}

function debtOnTrack(debtStatus?: DebtStatus): boolean {
  return debtStatus === "uptodate" || debtStatus === "nodebt";
}

function questProgress(steps: QuestStep[]): number {
  const total = steps.reduce((s, q) => s + q.weight, 0);
  if (total <= 0) return 100;
  const earned = steps.reduce((s, q) => s + (q.done ? q.weight : 0), 0);
  return Math.round((earned / total) * 100);
}

function stepsForTier(
  tier: MembershipTier,
  ctx: MembershipProgressContext
): QuestStep[] {
  const { profile, totalDebt = 0, totalSavings = 0, investmentAssetTotal = 0 } = ctx;
  const { debtStatus, savingsStatus, investmentStatus } = profile;

  switch (tier) {
    case "Debt Crusher":
      return [
        {
          id: "debt-current",
          label: "Catch up on overdue repayments",
          done: debtOnTrack(debtStatus),
          weight: 55,
        },
        {
          id: "savings-start",
          label: "Start building cash savings",
          done: hasSavings(savingsStatus, totalSavings),
          weight: 45,
        },
      ];
    case "Cash King":
      return [
        {
          id: "debt-maintain",
          label: "Stay current on all debts",
          done: debtOnTrack(debtStatus) && totalDebt >= 0,
          weight: 30,
        },
        {
          id: "savings-grow",
          label: "Grow your savings habit",
          done: savingsStatus === "growing" || totalSavings > 500,
          weight: 35,
        },
        {
          id: "first-investment",
          label: "Make your first investment",
          done:
            investmentStatus === "one" ||
            investmentStatus === "multiple" ||
            investmentAssetTotal > 0,
          weight: 35,
        },
      ];
    case "Wealth Creator":
      return [
        {
          id: "diversify",
          label: "Diversify across multiple investments",
          done: investmentStatus === "multiple" || investmentAssetTotal > 0,
          weight: 60,
        },
        {
          id: "net-worth",
          label: "Track and grow net worth",
          done: (profile.capital ?? 0) > 0 && debtOnTrack(debtStatus),
          weight: 40,
        },
      ];
    case "Legacy Builder":
      return [
        {
          id: "steward",
          label: "Protect and multiply your legacy",
          done: true,
          weight: 100,
        },
      ];
    default:
      return [];
  }
}

export function computeMembershipProgress(ctx: MembershipProgressContext): MembershipProgress {
  const currentTier = normalizeTier(ctx.profile.membership);
  const currentTierIndex = tierIndex(currentTier);
  const nextTier =
    currentTierIndex < MEMBERSHIP_TIERS.length - 1
      ? MEMBERSHIP_TIERS[currentTierIndex + 1]
      : null;

  const questSteps = stepsForTier(currentTier, ctx);
  const tierProgress =
    currentTier === "Legacy Builder" ? 100 : questProgress(questSteps);

  const journeyProgress =
    currentTier === "Legacy Builder"
      ? 100
      : journeyProgressAtTier(currentTierIndex, tierProgress, DESKTOP_TIER_ANCHORS);

  const tierContent = getMembershipTierContent(currentTier);
  const memberSinceLabel = new Date(ctx.profile.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return {
    currentTier,
    currentTierIndex,
    nextTier,
    tierProgress,
    journeyProgress,
    questSteps,
    nextMilestoneTitle: tierContent.nextMilestoneTitle,
    nextMilestoneBody: tierContent.nextMilestoneBody,
    memberSinceLabel,
  };
}

export interface MembershipPromotionResult {
  profile: UserProfile;
  promoted: boolean;
  promotedTiers: MembershipTier[];
}

/**
 * When every quest for the current tier is complete, advance membership to the
 * next tier, persist the profile, and award tier-promotion points (once per tier).
 */
export async function promoteMembershipTierIfEligible(
  ctx: MembershipProgressContext
): Promise<MembershipPromotionResult> {
  let profile = ctx.profile;
  const promotedTiers: MembershipTier[] = [];
  const financialCtx = {
    totalDebt: ctx.totalDebt,
    totalSavings: ctx.totalSavings,
    investmentAssetTotal: ctx.investmentAssetTotal,
  };

  while (true) {
    const progress = computeMembershipProgress({ profile, ...financialCtx });
    if (!progress.nextTier || progress.tierProgress < 100) break;

    const nextTier = progress.nextTier;
    profile = { ...profile, membership: nextTier };
    await storage.saveProfile(profile);
    await tryAwardTask("tier-promotion", { metadata: { tier: nextTier } });
    promotedTiers.push(nextTier);
  }

  return {
    profile,
    promoted: promotedTiers.length > 0,
    promotedTiers,
  };
}
