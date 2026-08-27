import type {
  DebtStatus,
  EmergencyResilience,
  IncomeStability,
  InvestmentStatus,
  MembershipTier,
  OnboardingMood,
  PrimaryGoal,
  SavingsStatus,
} from "@/types";

export const ONBOARDING_TOTAL_STEPS = 7;
export const ONBOARDING_FALLBACK_TIER: MembershipTier = "Debt Crusher";

export type OnboardingStepOption<T extends string> = {
  value: T;
  emoji: string;
  label: string;
};

export interface OnboardingAnswers {
  mood: OnboardingMood | null;
  debtStatus: DebtStatus | null;
  savingsStatus: SavingsStatus | null;
  investmentStatus: InvestmentStatus | null;
  incomeStability: IncomeStability | null;
  emergencyResilience: EmergencyResilience | null;
  primaryGoal: PrimaryGoal | null;
}

export const ONBOARDING_STEP_OPTIONS = {
  1: [
    {
      value: "overwhelmed",
      emoji: "😔",
      label: "I feel overwhelmed — money is a constant source of stress",
    },
    {
      value: "struggling",
      emoji: "😣",
      label: "I'm managing, but it's a struggle and I worry about falling behind",
    },
    {
      value: "progressing",
      emoji: "🙂",
      label: "I feel like I'm making progress and slowly getting things under control",
    },
    {
      value: "confident",
      emoji: "😊",
      label: "I feel confident — I know where I stand and I'm building toward something bigger",
    },
  ] as const satisfies OnboardingStepOption<OnboardingMood>[],
  2: [
    {
      value: "behind",
      emoji: "⚠️",
      label: "No — I'm behind on at least one payment right now",
    },
    {
      value: "uptodate",
      emoji: "✅",
      label: "Yes — I'm up to date with all my repayments",
    },
    {
      value: "nodebt",
      emoji: "🧾",
      label: "I don't currently have any debt",
    },
  ] as const satisfies OnboardingStepOption<DebtStatus>[],
  3: [
    {
      value: "none",
      emoji: "🪫",
      label: "Not yet — putting money aside doesn't feel possible right now",
    },
    {
      value: "started",
      emoji: "🌱",
      label: "Yes — I've started putting a little something away, even if it's small",
    },
    {
      value: "growing",
      emoji: "📈",
      label: "Yes — I have a growing savings amount that I add to regularly",
    },
  ] as const satisfies OnboardingStepOption<SavingsStatus>[],
  4: [
    {
      value: "none",
      emoji: "🚫",
      label: "No — I haven't started investing yet",
    },
    {
      value: "one",
      emoji: "🏦",
      label: "Yes — I invest with one financial institution",
    },
    {
      value: "multiple",
      emoji: "💼",
      label:
        "Yes — I invest with more than one financial institution, or have different types of investments (e.g. shares, property, etc)",
    },
  ] as const satisfies OnboardingStepOption<InvestmentStatus>[],
  5: [
    {
      value: "variable",
      emoji: "🌪️",
      label:
        "It varies a lot — some months are really tough and I never know exactly what's coming in",
    },
    {
      value: "stable_tight",
      emoji: "🧮",
      label: "It's mostly stable but things feel tight after all my expenses",
    },
    {
      value: "fixed",
      emoji: "📅",
      label: "It's fixed and predictable — I know exactly what to expect each month",
    },
    {
      value: "multiple",
      emoji: "🧩",
      label: "I have more than one source of income coming in regularly",
    },
  ] as const satisfies OnboardingStepOption<IncomeStability>[],
  6: [
    {
      value: "borrow",
      emoji: "💳",
      label:
        "I'd have to borrow money or put it on credit — there's nothing to fall back on",
    },
    {
      value: "wipe_out",
      emoji: "😬",
      label: "I'd manage, but it would wipe out almost everything I have",
    },
    {
      value: "small_buffer",
      emoji: "🛟",
      label: "I have a small buffer I could use without too much damage",
    },
    {
      value: "solid_fund",
      emoji: "🧱",
      label: "I have a solid emergency fund — this kind of thing wouldn't derail me",
    },
  ] as const satisfies OnboardingStepOption<EmergencyResilience>[],
  7: [
    {
      value: "debt",
      emoji: "⛓️",
      label: "Get on top of my debt and stop the cycle of falling behind",
    },
    {
      value: "savings",
      emoji: "🏦",
      label: "Build up my savings so I finally have a safety net",
    },
    {
      value: "investments",
      emoji: "📊",
      label: "Grow my investments and start building real, lasting wealth",
    },
    {
      value: "legacy",
      emoji: "🏛️",
      label:
        "Create a financial legacy that will outlast me and benefit my family",
    },
  ] as const satisfies OnboardingStepOption<PrimaryGoal>[],
};

export const ONBOARDING_STEP_META = [
  {
    title:
      "When you think about your finances right now, which of these feels most true?",
    subtitle:
      "There's no right or wrong answer — this helps us personalise your experience.",
    key: "mood",
  },
  {
    title:
      "Are you currently up to date with all your debt repayments? (Think: home loan, car finance, credit cards, personal loans, store accounts)",
    subtitle: "Select the option that best matches your current situation.",
    key: "debtStatus",
  },
  {
    title:
      "Do you have any money set aside in savings — even if it's just a small amount?",
    subtitle: "This helps us understand your financial safety net.",
    key: "savingsStatus",
  },
  {
    title:
      "Do you have any money invested with any financial institutions? (e.g. unit trusts, retirement annuities, endowments, or shares)",
    subtitle: "Choose the option that best matches your investment profile.",
    key: "investmentStatus",
  },
  {
    title: "How would you describe your monthly income?",
    subtitle: "Income stability influences your membership pathway.",
    key: "incomeStability",
  },
  {
    title:
      "If an unexpected expense landed on you today — say a car repair or a medical bill — how would you handle it?",
    subtitle: "This helps assess your emergency resilience.",
    key: "emergencyResilience",
  },
  {
    title: "What's the one thing you most want to achieve with One Way Out?",
    subtitle: "Your primary goal helps us tailor the experience after onboarding.",
    key: "primaryGoal",
  },
] as const;

function isDebtRepaymentOnTrack(debtStatus: DebtStatus | null): boolean {
  return debtStatus === "uptodate" || debtStatus === "nodebt";
}

export function computeMembershipTier(answers: OnboardingAnswers): MembershipTier {
  if (answers.debtStatus === "behind") return "Debt Crusher";

  const hasSavings =
    answers.savingsStatus === "started" || answers.savingsStatus === "growing";

  if (isDebtRepaymentOnTrack(answers.debtStatus) && hasSavings) {
    if (answers.investmentStatus === "none") return "Cash King";
    if (answers.investmentStatus === "one") return "Wealth Creator";
    if (answers.investmentStatus === "multiple") return "Legacy Builder";
  }

  return ONBOARDING_FALLBACK_TIER;
}

export function normalizeOnboardingStep(raw: number | undefined): number {
  if (!raw || Number.isNaN(raw)) return 1;
  return Math.max(1, Math.min(ONBOARDING_TOTAL_STEPS, Math.trunc(raw)));
}

export function isOnboardingComplete(answers: OnboardingAnswers): boolean {
  return (
    answers.mood != null &&
    answers.debtStatus != null &&
    answers.savingsStatus != null &&
    answers.investmentStatus != null &&
    answers.incomeStability != null &&
    answers.emergencyResilience != null &&
    answers.primaryGoal != null
  );
}

export const EMPTY_ONBOARDING_ANSWERS: OnboardingAnswers = {
  mood: null,
  debtStatus: null,
  savingsStatus: null,
  investmentStatus: null,
  incomeStability: null,
  emergencyResilience: null,
  primaryGoal: null,
};
