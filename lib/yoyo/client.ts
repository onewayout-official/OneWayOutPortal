import { supabase } from "@/lib/supabase";
import type { SpendGiftcardRequest, SpendGiftcardResponse } from "@/lib/yoyo/types";
import type { YoyoGiftcardCampaign } from "@/lib/yoyo/types";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchYoyoCampaigns(): Promise<{
  ok: boolean;
  campaigns: YoyoGiftcardCampaign[];
  error?: string;
}> {
  const headers = await authHeaders();
  const res = await fetch("/api/yoyo/campaigns", { headers });
  const json = await res.json();
  if (!res.ok) {
    return { ok: false, campaigns: [], error: json.error ?? "Failed to load campaigns" };
  }
  return {
    ok: Boolean(json.ok),
    campaigns: json.campaigns ?? [],
    error: json.ok ? undefined : json.responseDesc,
  };
}

export async function spendPointsForGiftcard(
  payload: SpendGiftcardRequest
): Promise<SpendGiftcardResponse> {
  const headers = await authHeaders();
  const res = await fetch("/api/yoyo/spend", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as SpendGiftcardResponse;
  if (!res.ok) {
    return {
      ok: false,
      error: json.error ?? "Could not generate gift card",
      responseDesc: json.responseDesc,
      responseCode: json.responseCode,
      giftcard: json.giftcard,
      pointsBalance: json.pointsBalance,
    };
  }
  return json;
}
