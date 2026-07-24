import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isYoyoSuccess } from "@/lib/yoyo/campaignMatch";
import { formatYoyoMobileNumber } from "@/lib/yoyo/phone";
import {
  extractGiftcards,
  getGiftcardById,
  isYoyoConfigured,
  listUserGiftcards,
} from "@/lib/yoyo/server";
import { toGiftcardStatusItem } from "@/lib/yoyo/giftcardStatus";
import type { GiftcardStatusItem } from "@/lib/yoyo/types";

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

export async function GET(request: NextRequest) {
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

  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = [
    ...new Set(
      idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ].slice(0, 30);

  const { data: profile } = await client
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const mobileNumber = formatYoyoMobileNumber(
    (profile as { phone?: string } | null)?.phone
  );

  // Mobile-backed cards first; also query UUID for older issues under user.id.
  const userRefs = [...new Set([mobileNumber, user.id].filter(Boolean) as string[])];

  const statuses: Record<string, GiftcardStatusItem> = {};
  let lastListResult: Awaited<ReturnType<typeof listUserGiftcards>> | null = null;

  for (const userRef of userRefs) {
    const listResult = await listUserGiftcards(userRef);
    lastListResult = listResult;
    if (listResult.ok || isYoyoSuccess(listResult.data)) {
      for (const card of extractGiftcards(listResult.data)) {
        if (ids.length === 0 || ids.includes(card.id)) {
          statuses[card.id] = toGiftcardStatusItem(card);
        }
      }
    }
  }

  const missingIds = ids.filter((id) => !statuses[id]);
  if (missingIds.length > 0) {
    const lookups = await Promise.all(
      missingIds.map(async (id) => {
        const result = await getGiftcardById(id);
        const card = extractGiftcards(result.data)[0];
        return card ? toGiftcardStatusItem(card) : null;
      })
    );
    for (const item of lookups) {
      if (item) statuses[item.id] = item;
    }
  }

  return NextResponse.json({
    ok: true,
    statuses,
    responseCode: lastListResult?.data.responseCode,
    responseDesc: lastListResult?.data.responseDesc,
  });
}
