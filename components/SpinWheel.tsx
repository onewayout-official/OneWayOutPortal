"use client";

import { useState, useCallback } from "react";
import {
  SPIN_WHEEL_SEGMENTS,
  SPIN_COST_POINTS,
  SPIN_WHEEL_BRAND,
} from "@/lib/gamification/config";
import { rewards } from "@/lib/gamification/rewards";
import { notifyRewardPointsUpdated } from "@/lib/gamification/rewardPoints";
import type { GamificationState, SpinResult } from "@/types";
import type { SpinMode } from "@/lib/gamification/config";
import { Sparkles } from "lucide-react";

interface SpinWheelProps {
  state: GamificationState;
  onStateChange: (next: Partial<GamificationState> & { balance: number }) => void;
  /** Modal / daily-login popup — no outer card chrome */
  variant?: "full" | "embedded";
  /** Hide token and paid spin buttons */
  freeSpinOnly?: boolean;
  /** Hide the token spin button (paid spin still available) */
  hideTokenSpin?: boolean;
  onFreeSpinComplete?: () => void;
}

const SEGMENT_ANGLE = 360 / SPIN_WHEEL_SEGMENTS.length;
const POINTER_ANGLE = 270;

export default function SpinWheel({
  state,
  onStateChange,
  variant = "full",
  freeSpinOnly = false,
  hideTokenSpin = false,
  onFreeSpinComplete,
}: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spinToPrize = useCallback((prize: number, onDone: () => void) => {
    const index = SPIN_WHEEL_SEGMENTS.findIndex((s) => s.points === prize);
    const idx = index >= 0 ? index : 0;
    const segmentCenter = idx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const extraTurns = 5 * 360;
    setRotation((currentRotation) => {
      const normalizedRotation = ((currentRotation % 360) + 360) % 360;
      const pointerDelta =
        (POINTER_ANGLE - segmentCenter - normalizedRotation + 360) % 360;
      return currentRotation + extraTurns + pointerDelta;
    });
    setTimeout(onDone, 4200);
  }, []);

  const handleSpin = async (mode: SpinMode) => {
    if (spinning) return;
    setError(null);
    setLastResult(null);
    setSpinning(true);

    const result = await rewards.spinWheel(mode);
    if (!result.ok) {
      setSpinning(false);
      const msg =
        result.error === "free_spin_used"
          ? "You already used your free spin today."
          : result.error === "no_spin_tokens"
            ? "No spin tokens available."
            : result.error === "insufficient_points"
              ? `You need at least ${SPIN_COST_POINTS} points for a paid spin.`
              : "Could not spin. Try again.";
      setError(msg);
      return;
    }

    spinToPrize(result.prize, () => {
      setSpinning(false);
      setLastResult(result);
      onStateChange({
        balance: result.balance,
        freeSpinAvailable: mode === "free" ? false : state.freeSpinAvailable,
        spinTokens: mode === "token" ? Math.max(0, state.spinTokens - 1) : state.spinTokens,
      });
      notifyRewardPointsUpdated();
      if (mode === "free") {
        onFreeSpinComplete?.();
      }
    });
  };

  const canFree = state.freeSpinAvailable;
  const canToken = state.spinTokens > 0;
  const canPaid = state.balance >= state.spinCost;
  const wheelSize = variant === "embedded" ? "w-56 h-56" : "w-64 h-64";
  const wrapperClass =
    variant === "embedded"
      ? ""
      : "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm";

  return (
    <div className={wrapperClass}>
      {variant === "full" && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Spin the wheel</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Win 10–500 points. One free spin daily
            {freeSpinOnly
              ? "."
              : hideTokenSpin
              ? `; use ${state.spinCost} points for extras.`
              : `; use tokens or ${state.spinCost} points for extras.`}
          </p>
        </>
      )}

      <div className={`relative mx-auto ${wheelSize} mb-4`}>
        <div
          className="absolute inset-0 rounded-full border-4 shadow-inner transition-transform duration-[4000ms] ease-out"
          style={{ borderColor: SPIN_WHEEL_BRAND, transform: `rotate(${rotation}deg)` }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {SPIN_WHEEL_SEGMENTS.map((seg, i) => {
              const start = (i * SEGMENT_ANGLE * Math.PI) / 180;
              const end = ((i + 1) * SEGMENT_ANGLE * Math.PI) / 180;
              const x1 = 100 + 95 * Math.cos(start);
              const y1 = 100 + 95 * Math.sin(start);
              const x2 = 100 + 95 * Math.cos(end);
              const y2 = 100 + 95 * Math.sin(end);
              const large = SEGMENT_ANGLE > 180 ? 1 : 0;
              const mid = ((i + 0.5) * SEGMENT_ANGLE * Math.PI) / 180;
              const tx = 100 + 62 * Math.cos(mid);
              const ty = 100 + 62 * Math.sin(mid);
              return (
                <g key={seg.points}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${large} 1 ${x2} ${y2} Z`}
                    fill={seg.color}
                  />
                  <text
                    x={tx}
                    y={ty}
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${(i + 0.5) * SEGMENT_ANGLE}, ${tx}, ${ty})`}
                  >
                    {seg.points}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-[#2f6064]" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-900 border-2 border-[#2f6064] flex items-center justify-center shadow-md">
            <Sparkles className="h-6 w-6 text-[#2f6064]" />
          </div>
        </div>
      </div>

      {lastResult?.ok && (
        <p className="text-center text-green-600 dark:text-green-400 font-semibold mb-3">
          You won {lastResult.prize} points!
        </p>
      )}
      {error && (
        <p className="text-center text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          disabled={spinning || !canFree}
          onClick={() => handleSpin("free")}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: SPIN_WHEEL_BRAND }}
        >
          {variant === "embedded" ? "Spin now" : "Free spin"}
        </button>
        {!freeSpinOnly && (
          <>
            {!hideTokenSpin && (
              <button
                type="button"
                disabled={spinning || !canToken}
                onClick={() => handleSpin("token")}
                className="px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-90 disabled:opacity-50 dark:hover:bg-[#2f6064]/20"
                style={{ borderColor: SPIN_WHEEL_BRAND, color: SPIN_WHEEL_BRAND }}
              >
                Use token ({state.spinTokens})
              </button>
            )}
            <button
              type="button"
              disabled={spinning || !canPaid}
              onClick={() => handleSpin("paid")}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {state.spinCost} pts
            </button>
          </>
        )}
      </div>
    </div>
  );
}
