"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import {
  REWARD_POINTS_AWARDED_EVENT,
  type RewardPointsAwardedDetail,
} from "@/lib/gamification/rewardPoints";

interface Toast {
  id: number;
  points: number;
}

const TOAST_DURATION_MS = 3500;

export default function PointsToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let counter = 0;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<RewardPointsAwardedDetail>).detail;
      const points = detail?.points ?? 0;
      if (points <= 0) return;

      const id = ++counter;
      setToasts((prev) => [...prev, { id, points }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION_MS);
    };

    window.addEventListener(REWARD_POINTS_AWARDED_EVENT, handler);
    return () => window.removeEventListener(REWARD_POINTS_AWARDED_EVENT, handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg shadow-black/10 dark:border-emerald-800 dark:bg-gray-800 animate-[points-toast-in_0.25s_ease-out]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <Coins className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              +{toast.points.toLocaleString()} points earned!
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Added to your 1-Reward Points</p>
          </div>
        </div>
      ))}
      <style jsx global>{`
        @keyframes points-toast-in {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
