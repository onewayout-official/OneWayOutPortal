import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractCampaigns, isYoyoConfigured, listGiftcardCampaigns } from "@/lib/yoyo/server";
import { isYoyoSuccess } from "@/lib/yoyo/campaignMatch";
import { formatYoyoMobileNumber } from "@/lib/yoyo/phone";

async function getAuthUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isYoyoConfigured()) {
    return NextResponse.json(
      { error: "Yoyo API not configured. Set YOYO_BASE_URL, YOYO_API_ID, YOYO_API_PASSWORD." },
      { status: 503 }
    );
  }

  const explicitRef = request.nextUrl.searchParams.get("userRef");
  let userRef = explicitRef?.trim() || "";

  if (!userRef) {
    const { data: profile } = await client
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    userRef =
      formatYoyoMobileNumber((profile as { phone?: string } | null)?.phone) ?? user.id;
  }

  const result = await listGiftcardCampaigns(userRef);
  const campaigns = extractCampaigns(result.data);

  return NextResponse.json({
    ok: result.ok && isYoyoSuccess(result.data),
    status: result.status,
    campaigns,
    responseCode: result.data.responseCode,
    responseDesc: result.data.responseDesc,
  });
}
