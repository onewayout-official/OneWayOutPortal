"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MembershipTier, UserProfile } from "@/types";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import TierResult from "@/components/onboarding/TierResult";
import { SIGNUP_BONUS_POINTS } from "@/lib/rewards";
import { rewards } from "@/lib/gamification/rewards";
import {
  computeMembershipTier,
  normalizeOnboardingStep,
  ONBOARDING_FALLBACK_TIER,
  ONBOARDING_STEP_META,
  ONBOARDING_STEP_OPTIONS,
  ONBOARDING_TOTAL_STEPS,
  type OnboardingAnswers,
} from "@/lib/onboarding";

const TOTAL_STEPS = ONBOARDING_TOTAL_STEPS;
const FALLBACK_TIER = ONBOARDING_FALLBACK_TIER;
const STEP_OPTIONS = ONBOARDING_STEP_OPTIONS;
const STEP_META = ONBOARDING_STEP_META;

function normalizeStep(raw: number | undefined): number {
  return normalizeOnboardingStep(raw);
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

