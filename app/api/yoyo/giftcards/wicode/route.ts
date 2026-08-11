import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isYoyoSuccess } from "@/lib/yoyo/campaignMatch";
import { remainingCentsFromCard } from "@/lib/yoyo/giftcardStatus";
import { formatYoyoMobileNumber } from "@/lib/yoyo/phone";
import {
  extractGiftcards,
  getGiftcardById,
  isYoyoConfigured,
  issueGiftcardWiCode,
  normalizeGiftcard,
  normalizeUserToken,
  recreateUserToken,
} from "@/lib/yoyo/server";
import type { GenerateWiCodeRequest } from "@/lib/yoyo/types";

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

function metadataGiftcardId(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "";
  for (const key of ["giftcard_id", "giftcardId"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function metadataUserRef(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "";
  for (const key of ["user_ref", "userRef"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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

  const body = (await request.json()) as GenerateWiCodeRequest;
  const giftcardId = String(body.giftcardId ?? "").trim();
  if (!giftcardId) {
    return NextResponse.json(
      { ok: false, error: "giftcardId is required." },
      { status: 400 }
    );
  }

  const { data: redeemRows, error: redeemLookupError } = await client
    .from("reward_transactions")
    .select("id, metadata")
    .eq("user_id", user.id)
    .lt("points_delta", 0)
    .order("created_at", { ascending: false })
    .limit(100);

  if (redeemLookupError) {
    return NextResponse.json(
      { ok: false, error: "Could not verify gift card ownership." },
      { status: 500 }
    );
  }

  const ownedRow = (redeemRows ?? []).find(
    (row) => metadataGiftcardId(row.metadata as Record<string, unknown>) === giftcardId
  );

  if (!ownedRow) {
    return NextResponse.json(
      { ok: false, error: "Gift card not found for this account." },
      { status: 404 }
    );
  }

  const { data: profile } = await client
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const profilePhone = (profile as { phone?: string } | null)?.phone;
  const mobileNumber = formatYoyoMobileNumber(profilePhone);
  const storedUserRef = metadataUserRef(ownedRow.metadata as Record<string, unknown>);

  const cardResult = await getGiftcardById(giftcardId);
  const card =
    extractGiftcards(cardResult.data)[0] ??
    normalizeGiftcard(cardResult.data.giftcard as unknown as Record<string, unknown>);

  if (!isYoyoSuccess(cardResult.data) || !card?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "giftcard_lookup_failed",
        responseDesc: cardResult.data.responseDesc ?? "Could not load gift card from Yoyo.",
        responseCode: cardResult.data.responseCode,
      },
      { status: 502 }
    );
  }

  // Prefer the userRef the card was issued under (usually phone), then redeem metadata, then profile.
  const userRef =
    (card.userRef && String(card.userRef).trim()) ||
    storedUserRef ||
    mobileNumber ||
    user.id;

  const remainingCents = remainingCentsFromCard(card);
  const stateUpper = (card.stateId ?? "").toUpperCase();

  if (stateUpper === "R" || remainingCents <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "fully_redeemed",
        responseDesc: "This gift card has no remaining balance.",
        giftcard: card,
        remainingCents: 0,
      },
      { status: 400 }
    );
  }

  if (stateUpper === "E") {
    return NextResponse.json(
      {
        ok: false,
        error: "expired",
        responseDesc: "This gift card has expired.",
        giftcard: card,
        remainingCents,
      },
      { status: 400 }
    );
  }

  if (stateUpper === "D") {
    return NextResponse.json(
      {
        ok: false,
        error: "deactivated",
        responseDesc: "This gift card is deactivated.",
        giftcard: card,
        remainingCents,
      },
      { status: 400 }
    );
  }

  if (stateUpper && stateUpper !== "A") {
    return NextResponse.json(
      {
        ok: false,
        error: "not_active",
        responseDesc: "This gift card cannot be used right now.",
        giftcard: card,
        remainingCents,
      },
      { status: 400 }
    );
  }

  // Primary: replace any existing user token, then reserve one scoped to this gift card.
  // Yoyo allows only one active token per userRef (phone).
  const tokenResult = await recreateUserToken(userRef, {
    giftcardIds: [giftcardId],
    ...(mobileNumber ? { mobileNumber } : {}),
  });
  const token = normalizeUserToken(
    tokenResult.data.token as unknown as Record<string, unknown> | undefined
  );

  if (isYoyoSuccess(tokenResult.data) && token?.wiCode) {
    return NextResponse.json({
      ok: true,
      wiCode: token.wiCode,
      validTillDate: token.validTillDate,
      remainingCents,
      giftcard: card,
      source: "user_token",
    });
  }

  console.warn("[yoyo/wicode] user token failed", {
    giftcardId,
    userRef,
    status: tokenResult.status,
    responseCode: tokenResult.data.responseCode,
    responseDesc: tokenResult.data.responseDesc,
  });

  // Fallback: giftcard-linked wiCode only when none is linked yet.
  if (!card.wiCode) {
    const wicodeResult = await issueGiftcardWiCode(giftcardId);
    const issuedToken = normalizeUserToken(
      (wicodeResult.data.token as unknown as Record<string, unknown> | undefined) ??
        (wicodeResult.data.giftcard as unknown as Record<string, unknown> | undefined)
    );
    const fallbackCode =
      issuedToken?.wiCode ??
      normalizeGiftcard(
        wicodeResult.data.giftcard as unknown as Record<string, unknown> | undefined
      )?.wiCode;

    if (isYoyoSuccess(wicodeResult.data) && fallbackCode) {
      return NextResponse.json({
        ok: true,
        wiCode: fallbackCode,
        validTillDate: issuedToken?.validTillDate ?? card.expiryDate,
        remainingCents,
        giftcard: card,
        source: "giftcard_wicode",
      });
    }

    console.warn("[yoyo/wicode] giftcard /wicode failed", {
      giftcardId,
      status: wicodeResult.status,
      responseCode: wicodeResult.data.responseCode,
      responseDesc: wicodeResult.data.responseDesc,
    });
  }

  // Gift cards issued with issueWiCode=true keep a linked multi-use wiCode.
  // If token minting fails, return that existing code so the user can still spend remaining balance.
  if (card.wiCode) {
    return NextResponse.json({
      ok: true,
      wiCode: card.wiCode,
      validTillDate: card.expiryDate,
      remainingCents,
      giftcard: card,
      source: "existing_giftcard_wicode",
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: "token_failed",
      responseDesc:
        tokenResult.data.responseDesc ??
        "Could not generate a new wiCode. Try again in a moment.",
      responseCode: tokenResult.data.responseCode,
      giftcard: card,
      remainingCents,
    },
    { status: 502 }
  );
}
