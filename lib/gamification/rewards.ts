import { supabase } from "@/lib/supabase";
import type { AwardTaskResult, GamificationState, RedeemResult, SpinResult } from "@/types";
import { getLocalDateString, type GamificationTaskId, type SpinMode } from "./config";

export interface AwardTaskOptions {
  localDate?: string;
  metadata?: Record<string, unknown>;
}

function parseState(data: Record<string, unknown> | null): GamificationState {
  if (!data) {
    return {
      balance: 0,
      spinTokens: 0,
      freeSpinAvailable: true,
      lastFreeSpinDate: null,
      completedTaskKeys: [],
      spinCost: 50,
    };
  }
  return {
    balance: Number(data.balance ?? 0),
    spinTokens: Number(data.spin_tokens ?? data.spinTokens ?? 0),
    freeSpinAvailable: Boolean(data.free_spin_available ?? data.freeSpinAvailable),
    lastFreeSpinDate: (data.last_free_spin_date ?? data.lastFreeSpinDate ?? null) as
      | string
      | null,
    completedTaskKeys: Array.isArray(data.completed_task_keys)
      ? (data.completed_task_keys as string[])
      : Array.isArray(data.completedTaskKeys)
        ? (data.completedTaskKeys as string[])
        : [],
    spinCost: Number(data.spin_cost ?? data.spinCost ?? 50),
  };
}

function parseAward(data: Record<string, unknown> | null): AwardTaskResult {
  return {
    ok: Boolean(data?.ok),
    alreadyCompleted: Boolean(data?.already_completed ?? data?.alreadyCompleted),
    pointsAwarded: Number(data?.points_awarded ?? data?.pointsAwarded ?? 0),
    balance: Number(data?.balance ?? 0),
    spinTokenGranted: Boolean(data?.spin_token_granted ?? data?.spinTokenGranted),
    error: data?.error != null ? String(data.error) : undefined,
  };
}

function parseRedeem(data: Record<string, unknown> | null): RedeemResult {
  return {
    ok: Boolean(data?.ok),
    balance: Number(data?.balance ?? 0),
    redeemed: Number(data?.redeemed ?? 0),
    error: data?.error != null ? String(data.error) : undefined,
  };
}

function parseSpin(data: Record<string, unknown> | null): SpinResult {
  const mode = data?.mode;
  const spinMode: SpinMode | undefined =
    mode === "free" || mode === "token" || mode === "paid" ? mode : undefined;
  return {
    ok: Boolean(data?.ok),
    prize: Number(data?.prize ?? 0),
    balance: Number(data?.balance ?? 0),
    mode: spinMode,
    error: data?.error != null ? String(data.error) : undefined,
  };
}

export const rewards = {
  getGamificationState: async (localDate?: string): Promise<GamificationState> => {
    const { data, error } = await supabase.rpc("get_gamification_state", {
      p_local_date: localDate ?? getLocalDateString(),
    });
    if (error) {
      console.error("[rewards] getGamificationState:", error.message);
      return parseState(null);
    }
    return parseState(data as Record<string, unknown>);
  },

  awardTask: async (
    taskId: GamificationTaskId,
    options?: AwardTaskOptions
  ): Promise<AwardTaskResult> => {
    const { data, error } = await supabase.rpc("award_task_points", {
      p_task_id: taskId,
      p_local_date: options?.localDate ?? getLocalDateString(),
      p_metadata: options?.metadata ?? {},
    });
    if (error) {
      console.error("[rewards] awardTask:", error.message);
      return {
        ok: false,
        alreadyCompleted: false,
        pointsAwarded: 0,
        balance: 0,
        spinTokenGranted: false,
        error: error.message,
      };
    }
    return parseAward(data as Record<string, unknown>);
  },

  redeemPoints: async (amount: number): Promise<RedeemResult> => {
    const { data, error } = await supabase.rpc("redeem_points", {
      p_amount: amount,
    });
    if (error) {
      console.error("[rewards] redeemPoints:", error.message);
      return { ok: false, balance: 0, redeemed: 0, error: error.message };
    }
    return parseRedeem(data as Record<string, unknown>);
  },

  spinWheel: async (mode: SpinMode, localDate?: string): Promise<SpinResult> => {
    const { data, error } = await supabase.rpc("spin_wheel", {
      p_mode: mode,
      p_local_date: localDate ?? getLocalDateString(),
    });
    if (error) {
      console.error("[rewards] spinWheel:", error.message);
      return { ok: false, prize: 0, balance: 0, error: error.message };
    }
    return parseSpin(data as Record<string, unknown>);
  },

  /** Wallet available balance (R) — sum of earned reward points ÷ 100, same as DashboardTopBar. */
  getAvailableWalletBalance: async (): Promise<number> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return 0;

    const { data: txns, error } = await supabase
      .from("reward_transactions")
      .select("points_delta")
      .eq("user_id", userId)
      .gt("points_delta", 0);

    if (error) {
      console.error("[rewards] getAvailableWalletBalance:", error.message);
      return 0;
    }

    const totalPoints = (txns ?? []).reduce((sum, row) => sum + Number(row.points_delta), 0);
    return totalPoints / 100;
  },

  getRewardHistory: async (limit = 20) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from("reward_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[rewards] getRewardHistory:", error.message);
      return [];
    }

    return (data ?? []).map((r) => ({
      id: r.id as string,
      kind: r.kind as string,
      source: r.source as string,
      pointsDelta: Number(r.points_delta),
      createdAt: r.created_at as string,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
    }));
  },
};

export async function tryAwardTask(
  taskId: GamificationTaskId,
  options?: AwardTaskOptions
): Promise<AwardTaskResult | null> {
  try {
    return await rewards.awardTask(taskId, options);
  } catch (e) {
    console.error("[rewards] tryAwardTask:", e);
    return null;
  }
}
