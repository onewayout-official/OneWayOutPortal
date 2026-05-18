"use client";

import Link from "next/link";
import { X, Coins } from "lucide-react";
import SpinWheel from "@/components/SpinWheel";
import type { GamificationState } from "@/types";

interface DailyLoginRewardsModalProps {
  open: boolean;
  loginPointsAwarded: number;
  gamification: GamificationState;
  onGamificationChange: (next: Partial<GamificationState> & { balance: number }) => void;
  onClose: () => void;
  onSpinComplete?: () => void;
}

export default function DailyLoginRewardsModal({
  open,
  loginPointsAwarded,
  gamification,
  onGamificationChange,
  onClose,
  onSpinComplete,
}: DailyLoginRewardsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-rewards-title"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-5 pt-6 space-y-4">
          <div className="text-center space-y-2 pr-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/40">
              <Coins className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <h2
              id="daily-rewards-title"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Welcome back!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loginPointsAwarded > 0 ? (
                <>
                  You earned <strong className="text-[#2f6064]">{loginPointsAwarded} points</strong>{" "}
                  for logging in today.
                </>
              ) : (
                <>Your daily login reward is ready.</>
              )}
              {gamification.freeSpinAvailable && (
                <span className="block mt-1">Spin the wheel for bonus points.</span>
              )}
            </p>
          </div>

          {gamification.freeSpinAvailable ? (
            <SpinWheel
              variant="embedded"
              freeSpinOnly
              state={gamification}
              onStateChange={onGamificationChange}
              onFreeSpinComplete={onSpinComplete}
            />
          ) : (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 py-4">
              You&apos;ve already used today&apos;s free spin. Visit Earn for more rewards.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Maybe later
            </button>
            <Link
              href="/earn"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-center text-white hover:opacity-90"
              style={{ backgroundColor: "#2f6064" }}
            >
              All rewards
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
