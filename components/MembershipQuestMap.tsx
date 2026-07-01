"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Shield, Crown, Building2, Gem, Lock, MapPin, Check, Sparkles } from "lucide-react";
import type { MembershipTier } from "@/types";
import type { MembershipProgress } from "@/lib/membershipProgress";
import { MEMBERSHIP_TIERS } from "@/lib/membershipProgress";

const TIER_VISUALS: Record<
  MembershipTier,
  {
    Icon: typeof Shield;
    emoji: string;
    biome: string;
    accent: string;
    accentDark: string;
    glow: string;
    pathFill: string;
  }
> = {
  "Debt Crusher": {
    Icon: Shield,
    emoji: "🛡️",
    biome: "Marshlands",
    accent: "#10b981",
    accentDark: "#047857",
    glow: "rgba(16, 185, 129, 0.45)",
    pathFill: "#34d399",
  },
  "Cash King": {
    Icon: Crown,
    emoji: "👑",
    biome: "Golden Plains",
    accent: "#f59e0b",
    accentDark: "#b45309",
    glow: "rgba(245, 158, 11, 0.45)",
    pathFill: "#fbbf24",
  },
  "Wealth Creator": {
    Icon: Building2,
    emoji: "💼",
    biome: "Prosperity City",
    accent: "#3b82f6",
    accentDark: "#1d4ed8",
    glow: "rgba(59, 130, 246, 0.45)",
    pathFill: "#60a5fa",
  },
  "Legacy Builder": {
    Icon: Gem,
    emoji: "🏛️",
    biome: "Summit of Freedom",
    accent: "#a855f7",
    accentDark: "#7e22ce",
    glow: "rgba(168, 85, 247, 0.45)",
    pathFill: "#c084fc",
  },
};

/** Winding quest path — viewBox 0 0 800 360 */
const DESKTOP_MAP_PATH =
  "M 60 280 C 120 220, 180 300, 240 240 S 360 120, 420 200 S 540 80, 600 160 S 700 60, 740 100";

const DESKTOP_CHECKPOINTS: { tier: MembershipTier; x: number; y: number }[] = [
  { tier: "Debt Crusher", x: 60, y: 280 },
  { tier: "Cash King", x: 240, y: 240 },
  { tier: "Wealth Creator", x: 420, y: 200 },
  { tier: "Legacy Builder", x: 740, y: 100 },
];

/** Mobile quest path — viewBox 0 0 320 560 */
const MOBILE_MAP_PATH =
  "M 72 72 C 210 116, 52 188, 136 248 S 254 346, 152 404 S 88 492, 232 500";

const MOBILE_CHECKPOINTS: { tier: MembershipTier; x: number; y: number; labelX: number; labelAnchor: "start" | "end" }[] = [
  { tier: "Debt Crusher", x: 72, y: 72, labelX: 120, labelAnchor: "start" },
  { tier: "Cash King", x: 136, y: 248, labelX: 188, labelAnchor: "start" },
  { tier: "Wealth Creator", x: 152, y: 404, labelX: 100, labelAnchor: "end" },
  { tier: "Legacy Builder", x: 232, y: 500, labelX: 180, labelAnchor: "end" },
];

interface MembershipQuestMapProps {
  progress: MembershipProgress;
}

export default function MembershipQuestMap({ progress }: MembershipQuestMapProps) {
  const desktopPathRef = useRef<SVGPathElement>(null);
  const mobilePathRef = useRef<SVGPathElement>(null);
  const [desktopPlayerPos, setDesktopPlayerPos] = useState({ x: 60, y: 280 });
  const [mobilePlayerPos, setMobilePlayerPos] = useState({ x: 72, y: 72 });
  const [desktopPathLength, setDesktopPathLength] = useState(0);
  const [mobilePathLength, setMobilePathLength] = useState(0);
  const gradientId = useId().replace(/:/g, "");

  const {
    currentTier,
    currentTierIndex,
    nextTier,
    tierProgress,
    journeyProgress,
    questSteps,
    nextMilestoneTitle,
    nextMilestoneBody,
    memberSinceLabel,
  } = progress;

  useEffect(() => {
    const updatePathProgress = (
      path: SVGPathElement | null,
      setLength: (length: number) => void,
      setPosition: (position: { x: number; y: number }) => void
    ) => {
      if (!path) return;
      const len = path.getTotalLength();
      setLength(len);
      const pt = path.getPointAtLength((journeyProgress / 100) * len);
      setPosition({ x: pt.x, y: pt.y });
    };

    updatePathProgress(desktopPathRef.current, setDesktopPathLength, setDesktopPlayerPos);
    updatePathProgress(mobilePathRef.current, setMobilePathLength, setMobilePlayerPos);
  }, [journeyProgress]);

  const currentVisual = TIER_VISUALS[currentTier];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2f6064]/20 bg-gradient-to-b from-sky-100 via-emerald-50/80 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-sm">
      {/* Header */}
      <div className="relative z-10 flex flex-col gap-3 border-b border-white/40 bg-white/60 px-5 py-4 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#2f6064] dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-[#2f6064] dark:text-emerald-300">Financial Quest Map</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your membership journey across four worlds
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2f6064]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2f6064] dark:bg-emerald-500/15 dark:text-emerald-300">
            <MapPin className="h-3 w-3" />
            {currentTier}
          </span>
          {nextTier && (
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm dark:bg-slate-800 dark:text-gray-300">
              {tierProgress}% to {nextTier}
            </span>
          )}
        </div>
      </div>

      {/* Map canvas */}
      <div className="relative px-2 pb-2 pt-4 sm:px-4">
        {/* Decorative terrain */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-8 bottom-0 h-32 w-48 rounded-full bg-emerald-200/40 blur-2xl dark:bg-emerald-900/20" />
          <div className="absolute right-0 top-8 h-28 w-40 rounded-full bg-amber-200/50 blur-2xl dark:bg-amber-900/20" />
          <div className="absolute left-1/3 top-0 h-24 w-32 rounded-full bg-sky-200/40 blur-2xl dark:bg-sky-900/20" />
        </div>

        <div className="relative mx-auto hidden w-full max-w-4xl overflow-hidden sm:block">
          <svg
            viewBox="0 0 800 360"
            className="h-auto w-full"
            role="img"
            aria-label={`Membership quest map. Current tier: ${currentTier}. ${tierProgress}% progress to next level.`}
          >
            <defs>
              <linearGradient id={`sky-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.35" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <filter id={`glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="800" height="360" fill={`url(#sky-${gradientId})`} />

            {/* Distant hills */}
            <path
              d="M0 320 Q200 260 400 300 T800 280 L800 360 L0 360 Z"
              className="fill-emerald-200/50 dark:fill-emerald-900/25"
            />
            <path
              d="M0 340 Q250 300 500 320 T800 310 L800 360 L0 360 Z"
              className="fill-emerald-300/40 dark:fill-emerald-800/20"
            />

            {/* Base path (locked / future) */}
            <path
              d={DESKTOP_MAP_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="14"
              strokeLinecap="round"
              className="text-stone-300/80 dark:text-slate-600/80"
            />
            <path
              d={DESKTOP_MAP_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="10 14"
              className="text-stone-400/60 dark:text-slate-500/60"
            />

            {/* Hidden path for length / player position */}
            <path ref={desktopPathRef} d={DESKTOP_MAP_PATH} fill="none" stroke="transparent" strokeWidth="8" />

            {/* Completed path segment */}
            {desktopPathLength > 0 && (
              <path
                d={DESKTOP_MAP_PATH}
                fill="none"
                stroke={currentVisual.pathFill}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(journeyProgress / 100) * desktopPathLength} ${desktopPathLength}`}
                className="transition-all duration-700 ease-out"
              />
            )}

            {/* Checkpoints */}
            {DESKTOP_CHECKPOINTS.map((cp, i) => {
              const visual = TIER_VISUALS[cp.tier];
              const isPast = i < currentTierIndex;
              const isCurrent = i === currentTierIndex;
              const isLocked = i > currentTierIndex;
              const Icon = visual.Icon;

              return (
                <g key={cp.tier} transform={`translate(${cp.x}, ${cp.y})`}>
                  {/* Island base */}
                  <ellipse
                    cx="0"
                    cy="28"
                    rx={isCurrent ? 52 : 44}
                    ry={isCurrent ? 18 : 14}
                    className={
                      isLocked
                        ? "fill-stone-300/70 dark:fill-slate-700/70"
                        : isPast
                          ? "fill-emerald-200/80 dark:fill-emerald-900/50"
                          : "fill-amber-100/90 dark:fill-amber-900/30"
                    }
                  />

                  {/* Glow ring for current */}
                  {isCurrent && (
                    <circle
                      r="42"
                      fill="none"
                      stroke={visual.accent}
                      strokeWidth="3"
                      opacity="0.5"
                      filter={`url(#glow-${gradientId})`}
                      className="animate-pulse"
                    />
                  )}

                  {/* Landmark circle */}
                  <circle
                    r={isCurrent ? 34 : 28}
                    fill={isLocked ? "#9ca3af" : visual.accent}
                    stroke="white"
                    strokeWidth="3"
                    className="drop-shadow-md"
                  />

                  {/* Icon */}
                  <foreignObject x="-14" y="-14" width="28" height="28">
                    <div className="flex h-full w-full items-center justify-center text-white">
                      {isLocked ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                  </foreignObject>

                  {/* Tier label */}
                  <text
                    y="58"
                    textAnchor="middle"
                    className={`fill-current text-[11px] font-bold ${
                      isCurrent
                        ? "text-gray-900 dark:text-white"
                        : isPast
                          ? "text-emerald-800 dark:text-emerald-300"
                          : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {i + 1}. {cp.tier}
                  </text>
                  <text
                    y="72"
                    textAnchor="middle"
                    className="fill-current text-[9px] font-medium text-gray-500 dark:text-gray-400"
                  >
                    {visual.biome}
                  </text>

                  {isPast && (
                    <g transform="translate(22, -22)">
                      <circle r="10" fill="#10b981" stroke="white" strokeWidth="2" />
                      <foreignObject x="-6" y="-6" width="12" height="12">
                        <div className="flex h-full w-full items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </div>
                      </foreignObject>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Player marker */}
            <g className="transition-all duration-700 ease-out">
              <g transform={`translate(${desktopPlayerPos.x}, ${desktopPlayerPos.y - 42})`}>
                <ellipse cx="0" cy="38" rx="10" ry="4" className="fill-black/15" />
                <circle r="14" fill={currentVisual.accent} stroke="white" strokeWidth="3" className="drop-shadow-lg" />
                <text y="5" textAnchor="middle" fontSize="14">
                  {currentVisual.emoji}
                </text>
              </g>
            </g>
          </svg>
        </div>

        <div className="relative mx-auto w-full overflow-hidden sm:hidden">
          <svg
            viewBox="0 0 320 560"
            className="h-auto w-full"
            role="img"
            aria-label={`Membership quest map. Current tier: ${currentTier}. ${tierProgress}% progress to next level.`}
          >
            <defs>
              <linearGradient id={`mobile-sky-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.4" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <filter id={`mobile-glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="320" height="560" fill={`url(#mobile-sky-${gradientId})`} />

            <path
              d="M0 500 Q80 458 160 496 T320 468 L320 560 L0 560 Z"
              className="fill-emerald-200/50 dark:fill-emerald-900/25"
            />
            <path
              d="M0 532 Q92 492 184 520 T320 504 L320 560 L0 560 Z"
              className="fill-emerald-300/40 dark:fill-emerald-800/20"
            />

            <path
              d={MOBILE_MAP_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="14"
              strokeLinecap="round"
              className="text-stone-300/80 dark:text-slate-600/80"
            />
            <path
              d={MOBILE_MAP_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="10 14"
              className="text-stone-400/60 dark:text-slate-500/60"
            />
            <path ref={mobilePathRef} d={MOBILE_MAP_PATH} fill="none" stroke="transparent" strokeWidth="8" />

            {mobilePathLength > 0 && (
              <path
                d={MOBILE_MAP_PATH}
                fill="none"
                stroke={currentVisual.pathFill}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(journeyProgress / 100) * mobilePathLength} ${mobilePathLength}`}
                className="transition-all duration-700 ease-out"
              />
            )}

            {MOBILE_CHECKPOINTS.map((cp, i) => {
              const visual = TIER_VISUALS[cp.tier];
              const isPast = i < currentTierIndex;
              const isCurrent = i === currentTierIndex;
              const isLocked = i > currentTierIndex;
              const Icon = visual.Icon;

              return (
                <g key={cp.tier}>
                  <g transform={`translate(${cp.x}, ${cp.y})`}>
                    <ellipse
                      cx="0"
                      cy="27"
                      rx={isCurrent ? 48 : 40}
                      ry={isCurrent ? 17 : 13}
                      className={
                        isLocked
                          ? "fill-stone-300/70 dark:fill-slate-700/70"
                          : isPast
                            ? "fill-emerald-200/80 dark:fill-emerald-900/50"
                            : "fill-amber-100/90 dark:fill-amber-900/30"
                      }
                    />

                    {isCurrent && (
                      <circle
                        r="39"
                        fill="none"
                        stroke={visual.accent}
                        strokeWidth="3"
                        opacity="0.5"
                        filter={`url(#mobile-glow-${gradientId})`}
                        className="animate-pulse"
                      />
                    )}

                    <circle
                      r={isCurrent ? 32 : 27}
                      fill={isLocked ? "#9ca3af" : visual.accent}
                      stroke="white"
                      strokeWidth="3"
                      className="drop-shadow-md"
                    />

                    <foreignObject x="-14" y="-14" width="28" height="28">
                      <div className="flex h-full w-full items-center justify-center text-white">
                        {isLocked ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                    </foreignObject>

                    {isPast && (
                      <g transform="translate(22, -22)">
                        <circle r="10" fill="#10b981" stroke="white" strokeWidth="2" />
                        <foreignObject x="-6" y="-6" width="12" height="12">
                          <div className="flex h-full w-full items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          </div>
                        </foreignObject>
                      </g>
                    )}
                  </g>

                  <text
                    x={cp.labelX}
                    y={cp.y - 5}
                    textAnchor={cp.labelAnchor}
                    className={`fill-current text-[13px] font-bold ${
                      isCurrent
                        ? "text-gray-900 dark:text-white"
                        : isPast
                          ? "text-emerald-800 dark:text-emerald-300"
                          : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {i + 1}. {cp.tier}
                  </text>
                  <text
                    x={cp.labelX}
                    y={cp.y + 12}
                    textAnchor={cp.labelAnchor}
                    className="fill-current text-[10px] font-medium text-gray-500 dark:text-gray-400"
                  >
                    {visual.biome}
                  </text>
                </g>
              );
            })}

            <g className="transition-all duration-700 ease-out">
              <g transform={`translate(${mobilePlayerPos.x}, ${mobilePlayerPos.y - 40})`}>
                <ellipse cx="0" cy="36" rx="10" ry="4" className="fill-black/15" />
                <circle r="14" fill={currentVisual.accent} stroke="white" strokeWidth="3" className="drop-shadow-lg" />
                <text y="5" textAnchor="middle" fontSize="14">
                  {currentVisual.emoji}
                </text>
              </g>
            </g>
          </svg>
        </div>

        {/* Tier legend strip */}
        <div className="mt-2 flex flex-wrap justify-center gap-2 px-2 pb-2">
          {MEMBERSHIP_TIERS.map((tier, i) => {
            const v = TIER_VISUALS[tier];
            const active = i === currentTierIndex;
            const done = i < currentTierIndex;
            return (
              <div
                key={tier}
                className={`flex h-14 w-14 items-center justify-center gap-1.5 rounded-full p-0 text-3xl font-semibold sm:h-auto sm:w-auto sm:justify-start sm:px-2.5 sm:py-1 sm:text-[10px] ${
                  active
                    ? "bg-white shadow-md ring-2 ring-offset-1 dark:bg-slate-800 dark:ring-offset-slate-900"
                    : done
                      ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-white/50 text-gray-500 dark:bg-slate-800/50 dark:text-gray-500"
                }`}
                style={active ? { boxShadow: `0 0 0 2px ${v.accent}` } : undefined}
              >
                <span className="leading-none sm:leading-normal">{v.emoji}</span>
                <span className="hidden sm:inline">{tier}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quest panel */}
      <div className="border-t border-white/40 bg-white/70 px-5 py-4 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/80">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Active quests */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#2f6064] dark:text-emerald-400">
              {nextTier ? `Quests to reach ${nextTier}` : "Legend status achieved"}
            </h3>
            <ul className="space-y-2">
              {questSteps.map((step) => (
                <li
                  key={step.id}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
                    step.done
                      ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-900/20"
                      : "border-gray-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.done
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 text-gray-500 dark:bg-slate-600 dark:text-gray-300"
                    }`}
                  >
                    {step.done ? <Check className="h-3 w-3" /> : "○"}
                  </span>
                  <span
                    className={
                      step.done
                        ? "text-emerald-800 line-through decoration-emerald-400/60 dark:text-emerald-300"
                        : "text-gray-700 dark:text-gray-200"
                    }
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>

            {nextTier && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
                  <span>Progress to {nextTier}</span>
                  <span>{tierProgress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${tierProgress}%`,
                      background: `linear-gradient(90deg, ${currentVisual.accent}, ${currentVisual.accentDark})`,
                    }}
                  />
                </div>
              </div>
            )}

            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-500">
              Member since {memberSinceLabel} · Overall journey {journeyProgress}%
            </p>
          </div>

          {/* Next milestone story */}
          <div className="rounded-xl border border-[#2f6064]/15 bg-gradient-to-br from-[#2f6064]/5 to-transparent p-4 dark:border-emerald-800/30 dark:from-emerald-900/20">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{nextMilestoneTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {nextMilestoneBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
