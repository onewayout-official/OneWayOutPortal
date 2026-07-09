import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchCampaignForStore, isYoyoSuccess } from "@/lib/yoyo/campaignMatch";
import { randToCents, randToPoints } from "@/lib/yoyo/retailFootprint";
import {
  fetchRewardTotalPoints,
} from "@/lib/gamification/rewardPoints";
import {
  extractCampaigns,
  issueGiftcardWithRetry,
  isYoyoConfigured,
  listGiftcardCampaigns,
  normalizeGiftcard,
} from "@/lib/yoyo/server";
import { formatYoyoMobileNumber } from "@/lib/yoyo/phone";
import type { IssueGiftcardBody, SpendGiftcardRequest } from "@/lib/yoyo/types";

async function getAuthUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return { user: null, client: null };

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { user: null, client: null };

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
  } = await client.auth.getUser(token);
  return { user, client };
}

async function tryIssue(body: IssueGiftcardBody) {
  let result = await issueGiftcardWithRetry(body, true);
  if (
    body.mobileNumber &&
    (!isYoyoSuccess(result.data) || !result.data.giftcard?.id) &&
    (result.status >= 400 || !result.ok)
  ) {
    const withoutMobile = { ...body };
    delete withoutMobile.mobileNumber;
    delete withoutMobile.sendSMS;
    result = await issueGiftcardWithRetry(withoutMobile, true);
  }
  return result;
}

export async function POST(request: NextRequest) {
  const { user, client } = await getAuthUser(request);
  if (!user || !client) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!isYoyoConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Yoyo API not configured on server." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as SpendGiftcardRequest;
  const storeName = (body.storeName ?? "").trim();
  const amountRand = Number(body.amountRand);

  if (!storeName || !Number.isFinite(amountRand) || amountRand <= 0) {
    return NextResponse.json(
      { ok: false, error: "Store and a positive amount (Rands) are required." },
      { status: 400 }
    );
  }

  const pointsRequired = randToPoints(amountRand);
  const balanceCents = randToCents(amountRand);

  const rewardTotal = await fetchRewardTotalPoints(client, user.id);

  if (pointsRequired > rewardTotal) {
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_points",
        pointsBalance: rewardTotal,
      },
      { status: 400 }
    );
  }

  const { data: profile } = await client
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  let campaignId = body.campaignId;
  let campaignName = "";

  const profilePhone = (profile as { phone?: string } | null)?.phone;
  const mobileNumber =
    formatYoyoMobileNumber(body.mobileNumber) ??
    formatYoyoMobileNumber(profilePhone);

  // Prefer mobile as Yoyo userRef when available (Yoyo docs use mobile-style refs).
  // Fall back to Supabase user id so redeem still works without a phone.
  const userRef = mobileNumber ?? user.id;

  const campaignsResult = await listGiftcardCampaigns(userRef);
  const campaigns = extractCampaigns(campaignsResult.data);

  if (campaignId) {
    const found = campaigns.find((c) => String(c.id) === String(campaignId));
    campaignName = found?.name ?? found?.description ?? String(campaignId);
  } else {
    const matched = matchCampaignForStore(storeName, campaigns);
    if (!matched) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_campaign",
          responseDesc: campaignsResult.data.responseDesc ?? "Could not load campaigns.",
          responseCode: campaignsResult.data.responseCode,
        },
        { status: 502 }
      );
    }
    campaignId = matched.id;
    campaignName = matched.name ?? matched.description ?? String(matched.id);
  }

  const issueBody: IssueGiftcardBody = {
    campaignId: Number(campaignId),
    balance: balanceCents,
    userRef,
    stateId: "A",
    ...(mobileNumber ? { mobileNumber, sendSMS: false } : {}),
  };

  const issueResult = await tryIssue(issueBody);
  const rawGc = issueResult.data.giftcard as Record<string, unknown> | undefined;
  const giftcard = normalizeGiftcard(rawGc);

  if (!isYoyoSuccess(issueResult.data) || !giftcard?.id) {
    const desc =
      issueResult.data.responseDesc ??
      (issueResult.status === 503
        ? "Yoyo sandbox temporarily unavailable (503). Wait a moment and try again."
        : "Gift card could not be issued.");
    return NextResponse.json(
      {
        ok: false,
        error: "issue_failed",
        responseDesc: desc,
        responseCode: issueResult.data.responseCode,
        status: issueResult.status,
        yoyoUrl: issueResult.url,
      },
      { status: 502 }
    );
  }

  const { data: redeemData, error: redeemError } = await client.rpc("redeem_points", {
    p_amount: pointsRequired,
    p_metadata: {
      giftcard_id: giftcard.id,
      wi_code: giftcard.wiCode ?? null,
      store_id: body.storeId,
      store_name: storeName,
      tab_id: body.tabId,
      amount_rand: amountRand,
      campaign_id: campaignId,
      campaign_name: campaignName,
      mobile_number: mobileNumber ?? null,
      user_ref: userRef,
      expiry_date: giftcard.expiryDate ?? null,
      create_date: giftcard.createDate ?? null,
      state_id: giftcard.stateId ?? "A",
    },
  });

  if (redeemError) {
    return NextResponse.json(
      {
        ok: false,
        error: "redeem_failed",
        giftcard,
        responseDesc:
          "Gift card was issued but points could not be deducted. Contact support.",
      },
      { status: 500 }
    );
  }

  const redeem = redeemData as {
    ok?: boolean;
    balance?: number;
    redeemed?: number;
    error?: string;
  };

  if (!redeem?.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: redeem?.error ?? "redeem_failed",
        giftcard,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    giftcard,
    pointsBalance: await fetchRewardTotalPoints(client, user.id),
    pointsRedeemed: Number(redeem.redeemed ?? pointsRequired),
    campaignName,
    amountRand,
  });
}
