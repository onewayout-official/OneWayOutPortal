"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DebtStatus,
  EmergencyResilience,
  IncomeStability,
  InvestmentStatus,
  MembershipTier,
  OnboardingMood,
  PrimaryGoal,
  SavingsStatus,
  UserProfile,
} from "@/types";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import TierResult from "@/components/onboarding/TierResult";
import { SIGNUP_BONUS_POINTS } from "@/lib/rewards";
import { rewards } from "@/lib/gamification/rewards";

const TOTAL_STEPS = 7;
const FALLBACK_TIER: MembershipTier = "Debt Crusher";

type StepOption<T extends string> = {
  value: T;
  emoji: string;
  label: string;
};

interface OnboardingAnswers {
  mood: OnboardingMood | null;
  debtStatus: DebtStatus | null;
  savingsStatus: SavingsStatus | null;
  investmentStatus: InvestmentStatus | null;
  incomeStability: IncomeStability | null;
  emergencyResilience: EmergencyResilience | null;
  primaryGoal: PrimaryGoal | null;
}

const STEP_OPTIONS = {
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
  ] as const satisfies StepOption<OnboardingMood>[],
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
  ] as const satisfies StepOption<DebtStatus>[],
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
  ] as const satisfies StepOption<SavingsStatus>[],
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
  ] as const satisfies StepOption<InvestmentStatus>[],
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
  ] as const satisfies StepOption<IncomeStability>[],
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
  ] as const satisfies StepOption<EmergencyResilience>[],
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
  ] as const satisfies StepOption<PrimaryGoal>[],
};

const STEP_META = [
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

/** Not behind on repayments — includes no debt (nodebt) and up to date (uptodate). */
function isDebtRepaymentOnTrack(debtStatus: DebtStatus | null): boolean {
  return debtStatus === "uptodate" || debtStatus === "nodebt";
}

function computeMembershipTier(answers: OnboardingAnswers): MembershipTier {
  if (answers.debtStatus === "behind") return "Debt Crusher";

  const hasSavings =
    answers.savingsStatus === "started" || answers.savingsStatus === "growing";

  if (isDebtRepaymentOnTrack(answers.debtStatus) && hasSavings) {
    if (answers.investmentStatus === "none") return "Cash King";
    if (answers.investmentStatus === "one") return "Wealth Creator";
    if (answers.investmentStatus === "multiple") return "Legacy Builder";
  }

  return FALLBACK_TIER;
}

function normalizeStep(raw: number | undefined): number {
  if (!raw || Number.isNaN(raw)) return 1;
  return Math.max(1, Math.min(TOTAL_STEPS, Math.trunc(raw)));
}

export default function OnboardingForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    mood: null,
    debtStatus: null,
    savingsStatus: null,
    investmentStatus: null,
    incomeStability: null,
    emergencyResilience: null,
    primaryGoal: null,
  });
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedTier, setCompletedTier] = useState<{
    membership: MembershipTier;
    points: number;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await storage.getProfile();
        if (cancelled || !profile) return;
        setAnswers({
          mood: profile.onboardingMood ?? null,
          debtStatus: profile.debtStatus ?? null,
          savingsStatus: profile.savingsStatus ?? null,
          investmentStatus: profile.investmentStatus ?? null,
          incomeStability: profile.incomeStability ?? null,
          emergencyResilience: profile.emergencyResilience ?? null,
          primaryGoal: profile.primaryGoal ?? null,
        });
        setCurrentStep(normalizeStep(profile.onboardingStep));
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedValue =
    answers[STEP_META[currentStep - 1].key as keyof OnboardingAnswers];

  async function saveProgress(
    nextAnswers: OnboardingAnswers,
    nextStep: number,
    markCompleted = false
  ): Promise<{ membership: MembershipTier; points: number } | null> {
    if (!user) return null;
    const existing = await storage.getProfile();
    if (!existing) return null;

    const membership = markCompleted
      ? computeMembershipTier(nextAnswers)
      : existing.membership ?? FALLBACK_TIER;

    const profile: UserProfile = {
      ...existing,
      onboardingMood: nextAnswers.mood ?? undefined,
      debtStatus: nextAnswers.debtStatus ?? undefined,
      savingsStatus: nextAnswers.savingsStatus ?? undefined,
      investmentStatus: nextAnswers.investmentStatus ?? undefined,
      incomeStability: nextAnswers.incomeStability ?? undefined,
      emergencyResilience: nextAnswers.emergencyResilience ?? undefined,
      primaryGoal: nextAnswers.primaryGoal ?? undefined,
      onboardingStep: normalizeStep(nextStep),
      onboardingCompleted: markCompleted,
      onboardingSkipped: markCompleted ? false : existing.onboardingSkipped ?? false,
      membership,
    };

    await storage.saveProfile(profile);

    let points = existing.userPoints ?? SIGNUP_BONUS_POINTS;
    if (markCompleted) {
      const award = await rewards.awardTask("onboarding-complete");
      if (award.ok) {
        points = award.balance;
      }
      const tierAward = await rewards.awardTask("tier-promotion", {
        metadata: { tier: membership },
      });
      if (tierAward.ok && tierAward.pointsAwarded > 0) {
        points = tierAward.balance;
      }
    }

    return { membership, points };
  }

  async function handleContinue() {
    if (!selectedValue || isSaving) return;
    setSubmitError(null);
    setIsSaving(true);
    try {
      const nextStep = Math.min(currentStep + 1, TOTAL_STEPS);
      await saveProgress(answers, nextStep, false);
      setCurrentStep(nextStep);
    } catch (error) {
      console.error("Onboarding autosave error:", error);
      setSubmitError("Could not save your progress. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete() {
    if (!selectedValue || isSaving) return;
    setSubmitError(null);
    setIsSaving(true);
    try {
      const existing = await storage.getProfile();
      const finalAnswers: OnboardingAnswers = {
        mood: answers.mood ?? existing?.onboardingMood ?? null,
        debtStatus: answers.debtStatus ?? existing?.debtStatus ?? null,
        savingsStatus: answers.savingsStatus ?? existing?.savingsStatus ?? null,
        investmentStatus:
          answers.investmentStatus ?? existing?.investmentStatus ?? null,
        incomeStability: answers.incomeStability ?? existing?.incomeStability ?? null,
        emergencyResilience:
          answers.emergencyResilience ?? existing?.emergencyResilience ?? null,
        primaryGoal: answers.primaryGoal ?? existing?.primaryGoal ?? null,
      };
      const result = await saveProgress(finalAnswers, TOTAL_STEPS, true);
      if (!result) {
        setSubmitError("Could not load your profile. Please try again.");
        setIsSaving(false);
        return;
      }
      setCompletedTier(result);
      setShowCelebration(false);
    } catch (error) {
      console.error("Onboarding completion error:", error);
      setSubmitError("Could not complete onboarding. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    if (!user || isSaving) return;
    setSubmitError(null);
    setIsSaving(true);
    try {
      const profile = await storage.getProfile();
      if (!profile) return;
      await storage.saveProfile({
        ...profile,
        onboardingSkipped: true,
        onboardingCompleted: false,
        onboardingStep: normalizeStep(currentStep),
        onboardingMood: answers.mood ?? undefined,
        debtStatus: answers.debtStatus ?? undefined,
        savingsStatus: answers.savingsStatus ?? undefined,
        investmentStatus: answers.investmentStatus ?? undefined,
        incomeStability: answers.incomeStability ?? undefined,
        emergencyResilience: answers.emergencyResilience ?? undefined,
        primaryGoal: answers.primaryGoal ?? undefined,
      });
      router.push("/");
    } catch (error) {
      console.error("Skip onboarding error:", error);
      setSubmitError("Could not save your skip choice. Please try again.");
      setIsSaving(false);
    }
  }

  function updateSelection(value: string) {
    const key = STEP_META[currentStep - 1].key as keyof OnboardingAnswers;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const options = STEP_OPTIONS[currentStep as keyof typeof STEP_OPTIONS];
  const meta = STEP_META[currentStep - 1];
  const showTierResult = completedTier !== null && !showCelebration;
  const progressPercent = showTierResult || showCelebration
    ? 100
    : (currentStep / TOTAL_STEPS) * 100;
  const isLastStep = currentStep === TOTAL_STEPS;

  if (isHydrating) {
    return (
      <div className="onboarding-page">
        <main className="onboarding-body">
          <div className="onboarding-card">
            <p className="onboarding-sub">Loading your onboarding progress...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <div className="onboarding-header-inner">
        <div className="onboarding-brand">
          <div className="onboarding-brand-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
          <span className="onboarding-brand-name">One Way Out</span>
        </div>

        <div className="onboarding-progress-wrap">
          <span className="onboarding-progress-label">Your profile</span>
          <div className="onboarding-progress-track">
            <div
              className="onboarding-progress-fill"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
            />
          </div>
        </div>

        <span className="onboarding-step-count">
          {currentStep} / {TOTAL_STEPS}
        </span>
        </div>
      </header>

      <main className="onboarding-body">
        {showTierResult && completedTier ? (
          <TierResult
            tier={completedTier.membership}
            onNext={() => setShowCelebration(true)}
          />
        ) : completedTier ? null : (
        <div className="onboarding-card">
          <span className="onboarding-eyebrow">Step {currentStep} of {TOTAL_STEPS}</span>
          <h1 className="onboarding-question">{meta.title}</h1>
          <p className="onboarding-sub">{meta.subtitle}</p>

          <div className="mood-options" role="radiogroup" aria-label={meta.title}>
            {options.map((option) => {
              const isSelected = selectedValue === option.value;
              return (
                <button
                  key={option.value}
                  id={`onboarding-option-${currentStep}-${option.value}`}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`mood-option${isSelected ? " selected" : ""}`}
                  onClick={() => updateSelection(option.value)}
                >
                  <span className="mood-emoji" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="mood-text">{option.label}</span>
                  <span className="mood-check" aria-hidden="true">
                    {isSelected ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {submitError ? <p className="field-error">{submitError}</p> : null}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="btn-continue"
              disabled={!selectedValue || isSaving}
              onClick={isLastStep ? handleComplete : handleContinue}
              id={`btn-onboarding-continue-${currentStep}`}
            >
              {isSaving
                ? "Saving..."
                : isLastStep
                  ? "Complete Setup"
                  : "Continue"}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              className="consent-btn-skip"
              disabled={isSaving}
              onClick={handleSkip}
            >
              Skip for now — I&apos;ll complete this later
            </button>
          </div>
        </div>
        )}
      </main>

      {showCelebration && completedTier ? (
        <div className="consent-overlay" role="dialog" aria-modal="true">
          <div className="consent-modal">
            <div className="consent-modal-header">
              <div className="text-3xl mb-2">🎉</div>
              <h2 className="consent-modal-title">You Did It!</h2>
              <p className="consent-modal-sub">
                Welcome to One Way Out. You have unlocked your first membership level and reward points.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="tier-stat-box">
                <p className="tier-stat-label">Membership Level</p>
                <p className="text-base font-bold text-[var(--brand-primary)]">
                  {completedTier.membership}
                </p>
              </div>
              <div className="tier-milestone">
                <p className="tier-milestone-header">Rewards Unlocked</p>
                <p className="tier-milestone-body">
                  You now have <span className="tier-stat-highlight">{completedTier.points} points</span> to spend on things across the portal.
                </p>
              </div>
            </div>
            <div className="consent-modal-actions">
              <button
                type="button"
                className="btn-continue"
                onClick={() => router.push("/")}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

