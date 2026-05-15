import { MembershipTier } from "@/types";

export interface TierDisplayContent {
  tierNumber: number;
  badgeLabel: string;
  percentBadge: string | null;
  emoji: string;
  headline: string;
  body: string;
  statLabel: string;
  statBody: string;
  statHighlight: string;
  nextMilestoneTitle: string;
  nextMilestoneBody: string;
  cta: string;
}

export const MEMBERSHIP_TIER_CONTENT: Record<MembershipTier, TierDisplayContent> = {
  "Debt Crusher": {
    tierNumber: 1,
    badgeLabel: "Tier 1 of 4",
    percentBadge: null,
    emoji: "🛡️",
    headline: "You're a Debt Crusher — and that title means something.",
    body: "It takes real courage to look your finances in the eye and say \"I need help.\" The fact that you're here, doing this, already puts you ahead of most people who never take that first step.",
    statLabel: "You're not alone:",
    statBody:
      "Right now, over 62% of working adults in Namibia and South Africa are behind on at least one debt repayment. You are not the exception — you are in the majority. The difference between where you are and where you want to be isn't willpower. It's a plan.",
    statHighlight: "62%",
    nextMilestoneTitle: "Your next milestone — Cash King:",
    nextMilestoneBody:
      "Your one job right now is simple: close the gap on your arrears and make one debt payment on time. Just one. Then another. OneWayOut will help you track every payment, see your progress in real time, and celebrate every step forward — no matter how small. Your Cash King moment is closer than you think.",
    cta: "Let's start crushing that debt",
  },
  "Cash King": {
    tierNumber: 2,
    badgeLabel: "Tier 2 of 4",
    percentBadge: "Top 38%",
    emoji: "👑",
    headline: "You're a Cash King — and you've earned it.",
    body: "Staying on top of your debts while managing everything else life throws at you is genuinely hard. The fact that you're up to date and you've started saving — even if it's just a little — shows real financial discipline. Don't underestimate that.",
    statLabel: "You're not alone:",
    statBody:
      "Only 38% of people who start a financial journey like this make it to where you are right now. Most people never get to zero arrears. You did. Take a moment to let that land.",
    statHighlight: "38%",
    nextMilestoneTitle: "Your next milestone — Wealth Creator:",
    nextMilestoneBody:
      "The next step is making your money work for you, not just resting in savings. When you're ready, OneWayOut will show you how to take even a small amount and put it to work through an investment with a financial institution. You don't need a lot to start — you just need to start. Your Wealth Creator chapter is waiting.",
    cta: "Let's protect and grow what you've built",
  },
  "Wealth Creator": {
    tierNumber: 3,
    badgeLabel: "Tier 3 of 4",
    percentBadge: "Top 12%",
    emoji: "💼",
    headline: "You're a Wealth Creator — you're already building something real.",
    body: "You've done what most people only talk about. Your debts are under control, you're saving, and you've taken the step into investing. That's not luck — that's the result of choices you made, probably while it wasn't easy. We see that, and we want to help you go further.",
    statLabel: "You are entering top tier:",
    statBody:
      "Only around 12% of people in your income bracket have a savings and an active investment. You are genuinely in a minority. But there's a ceiling on what a single investment can do for your future — and that's exactly where OneWayOut comes in.",
    statHighlight: "12%",
    nextMilestoneTitle: "Your next milestone — Legacy Builder:",
    nextMilestoneBody:
      "The difference between where you are and Legacy status is diversification — spreading your investments across more than one vehicle so your wealth isn't dependent on one outcome. OneWayOut will help you understand your current investment, identify the right next move, and track your net worth as it grows. Your Legacy Builder chapter starts with one more investment decision.",
    cta: "Let's build something that lasts",
  },
  "Legacy Builder": {
    tierNumber: 4,
    badgeLabel: "Tier 4 of 4",
    percentBadge: "Top 5%",
    emoji: "🏛️",
    headline: "You're a Legacy Builder — welcome to the top tier.",
    body: "You didn't get here by accident. You made hard decisions, stayed consistent when it was inconvenient, and kept going even when the results felt invisible. What you've built — diversified investments, a savings habit, zero arrears — is something most people spend their whole lives chasing. We're honoured you're here.",
    statLabel: "You are leading:",
    statBody:
      "Fewer than 5% of people in your financial position actively track and manage their wealth in a single place. Most Legacy Builders accumulate blind spots — money sitting in underperforming accounts, a gap in their insurance, an investment they forgot to review. One Way Out is built to make sure that never happens to you.",
    statHighlight: "5%",
    nextMilestoneTitle: "Your mission — protect and multiply:",
    nextMilestoneBody:
      "Your work now isn't about starting — it's about stewarding. One Way Out will give you a complete view of your net worth, flag anything that needs attention, and help you make sure the wealth you've worked so hard to build keeps growing and reaches the people who matter most to you.",
    cta: "Let's protect your legacy",
  },
};

export function getMembershipTierContent(tier: MembershipTier): TierDisplayContent {
  return MEMBERSHIP_TIER_CONTENT[tier];
}
