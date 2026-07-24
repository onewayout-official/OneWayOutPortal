import type { SupabaseClient } from "@supabase/supabase-js";

export const REWARD_POINTS_UPDATED_EVENT = "onewayout-reward-points-updated";
export const REWARD_POINTS_AWARDED_EVENT = "onewayout-reward-points-awarded";
const REWARD_REDEMPTION_CUTOFF_MS = Date.parse("2026-07-09T15:00:00.000Z");

export interface RewardPointsAwardedDetail {
  points: number;
  source?: string;
}

/** Notify top bar / nav to refresh rewards totals after a redemption or earn. */
export function notifyRewardPointsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REWARD_POINTS_UPDATED_EVENT));
  }
}

/**
 * Announce that the user just earned points, so a global toast can surface it.
 * Also refreshes the top bar / totals.
 */
export function notifyRewardPointsAwarded(points: number, source?: string): void {
  if (typeof window === "undefined" || points <= 0) return;
  window.dispatchEvent(
    new CustomEvent<RewardPointsAwardedDetail>(REWARD_POINTS_AWARDED_EVENT, {
      detail: { points, source },
    })
  );
  notifyRewardPointsUpdated();
}

async function fetchEarnedAndRedeemed(
  client: SupabaseClient,
  userId: string
): Promise<{ earned: number; redeemed: number; ok: boolean }> {
  const [earnedResult, redeemedResult] = await Promise.all([
    client
      .from("reward_transactions")
      .select("points_delta")
      .eq("user_id", userId)
      .gt("points_delta", 0),
    client
      .from("reward_transactions")
      .select("points_delta, created_at, metadata")
      .eq("user_id", userId)
      .eq("kind", "redeem")
      .lt("points_delta", 0),
  ]);

  if (earnedResult.error) {
    console.error("[rewardPoints] earned query:", earnedResult.error.message);
    return { earned: 0, redeemed: 0, ok: false };
  }

  if (redeemedResult.error) {
    console.error("[rewardPoints] redeemed query:", redeemedResult.error.message);
  }

  const earned = (earnedResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.points_delta),
    0
  );

  const redeemed = (redeemedResult.data ?? [])
    .filter((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      if (metadata.exclude_from_reward_balance === true) return false;
      const createdMs = Date.parse(String(row.created_at));
      return !Number.isFinite(createdMs) || createdMs >= REWARD_REDEMPTION_CUTOFF_MS;
    })
    .reduce((sum, row) => sum + Math.abs(Number(row.points_delta)), 0);

  return { earned, redeemed, ok: true };
}

/**
 * Current rewards balance: lifetime earned minus gift-card / spend redemptions
 * (legacy test redemptions before the cutoff are excluded).
 * Shown on Spend page and DashboardTopBar "Total Points"; decreases when points are redeemed.
 */
export async function fetchRewardTotalPoints(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  const { earned, redeemed, ok } = await fetchEarnedAndRedeemed(client, userId);

  // Client-side calculation is authoritative: it correctly subtracts new
  // redemptions. Only fall back to the RPC when the earned query itself failed.
  if (ok) {
    return Math.max(0, earned - redeemed);
  }

  const { data: rpcBalance, error: rpcError } = await client.rpc("get_reward_balance");
  if (!rpcError && rpcBalance != null && Number.isFinite(Number(rpcBalance))) {
    return Math.max(0, Number(rpcBalance));
  }

  return 0;
}

/** @deprecated Alias for fetchRewardTotalPoints */
export async function fetchRewardSpendablePoints(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  return fetchRewardTotalPoints(client, userId);
}
