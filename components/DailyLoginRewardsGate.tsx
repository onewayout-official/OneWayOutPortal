"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { rewards } from "@/lib/gamification/rewards";
import { storage } from "@/lib/storage";
import { wasDailyPopupDismissed, markDailyPopupDismissed } from "@/lib/gamification/dailyPopup";
import type { GamificationState } from "@/types";
import DailyLoginRewardsModal from "@/components/DailyLoginRewardsModal";

const EMPTY_STATE: GamificationState = {
  balance: 0,
  spinTokens: 0,
  freeSpinAvailable: false,
  lastFreeSpinDate: null,
  completedTaskKeys: [],
  spinCost: 50,
};

export default function DailyLoginRewardsGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loginPointsAwarded, setLoginPointsAwarded] = useState(0);
  const [gamification, setGamification] = useState<GamificationState>(EMPTY_STATE);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || checkedRef.current) return;
    checkedRef.current = true;

    let cancelled = false;

    async function run() {
      if (wasDailyPopupDismissed()) return;

      // Do not fire the daily-login reward / spin wheel until the user has
      // finished onboarding, otherwise it pops up mid-signup on /onboarding.
      const profile = await storage.getProfile();
      if (cancelled) return;
      const onboarded = Boolean(
        profile && (profile.onboardingCompleted || profile.onboardingSkipped)
      );
      if (!onboarded) return;

      const loginResult = await rewards.awardTask("daily-login");
      const state = await rewards.getGamificationState();

      if (cancelled) return;

      const shouldShow =
        state.freeSpinAvailable ||
        (!loginResult.alreadyCompleted && loginResult.pointsAwarded > 0);

      if (!shouldShow) return;

      setLoginPointsAwarded(loginResult.pointsAwarded);
      setGamification(state);
      setOpen(true);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const handleClose = () => {
    markDailyPopupDismissed();
    setOpen(false);
  };

  const handleGamificationChange = (next: Partial<GamificationState> & { balance: number }) => {
    setGamification((prev) => ({
      ...prev,
      balance: next.balance,
      freeSpinAvailable: next.freeSpinAvailable ?? prev.freeSpinAvailable,
      spinTokens: next.spinTokens ?? prev.spinTokens,
    }));
  };

  return (
    <>
      {children}
      <DailyLoginRewardsModal
        open={open}
        loginPointsAwarded={loginPointsAwarded}
        gamification={gamification}
        onGamificationChange={handleGamificationChange}
        onClose={handleClose}
        onSpinComplete={() => {
          setTimeout(handleClose, 1800);
        }}
      />
    </>
  );
}
