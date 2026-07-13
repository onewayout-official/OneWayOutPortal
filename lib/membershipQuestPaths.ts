/**
 * Tier anchor positions along the quest map SVG paths (0–100% of path length).
 * Derived from checkpoint coordinates on each path — not equal thirds.
 */
export const DESKTOP_TIER_ANCHORS = [0, 25, 51.9, 100] as const;
export const MOBILE_TIER_ANCHORS = [0, 38.3, 71.5, 100] as const;

export function journeyProgressAtTier(
  tierIndex: number,
  tierProgress: number,
  anchors: readonly number[]
): number {
  if (tierIndex >= anchors.length - 1) return 100;

  const start = anchors[tierIndex] ?? 0;
  const end = anchors[tierIndex + 1] ?? 100;
  const blended = start + (tierProgress / 100) * (end - start);

  return Math.min(99, Math.round(blended));
}
