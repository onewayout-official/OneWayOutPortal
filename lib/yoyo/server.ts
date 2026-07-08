import { isYoyoSuccess } from "@/lib/yoyo/campaignMatch";
import { toGiftcardStatusItem } from "@/lib/yoyo/giftcardStatus";
import type {
  IssueGiftcardBody,
  YoyoApiEnvelope,
  YoyoGiftcard,
  YoyoProxyResult,
} from "@/lib/yoyo/types";

export { giftcardStatusFromState, toGiftcardStatusItem } from "@/lib/yoyo/giftcardStatus";

export function getYoyoConfig() {
  return {
    baseUrl: (process.env.YOYO_BASE_URL ?? "https://za-vsp-int.wigroup.co/cvs-issuer/rest")
      .trim()
      .replace(/\/$/, ""),
    apiId: (process.env.YOYO_API_ID ?? "onewayout").trim(),
    apiPassword: (process.env.YOYO_API_PASSWORD ?? "test").trim(),
  };
}

export function isYoyoConfigured(): boolean {
  const { baseUrl, apiId, apiPassword } = getYoyoConfig();
  return Boolean(baseUrl && apiId && apiPassword);
}

export async function yoyoRequest<T = YoyoApiEnvelope>(
  method: string,
  path: string,
  options?: {
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    giftcardId?: string;
  }
): Promise<YoyoProxyResult<T>> {
  const { baseUrl, apiId, apiPassword } = getYoyoConfig();

  if (!path.startsWith("/")) {
    return { ok: false, status: 400, data: { responseDesc: "Invalid path" } as T };
  }

  let url = `${baseUrl}${path}`;
  const query = options?.query ?? {};
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      filtered[key] = String(value);
    }
  }
  if (Object.keys(filtered).length > 0) {
    url += `?${new URLSearchParams(filtered).toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    apiId,
    apiPassword,
  };
  if (options?.giftcardId) {
    headers.id = options.giftcardId;
  }

  const init: RequestInit = {
    method: method.toUpperCase(),
    headers,
    signal: AbortSignal.timeout(60_000),
  };

  if (options?.body != null && !["GET", "DELETE"].includes(method.toUpperCase())) {
    init.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, init);
    const text = await response.text();
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      data = { raw: text } as T;
    }
    return {
      ok: response.ok,
      status: response.status,
      data,
      url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return {
      ok: false,
      status: 0,
      data: { responseDesc: message } as T,
      url,
    };
  }
}

export async function listGiftcardCampaigns(userRef?: string) {
  return yoyoRequest<YoyoApiEnvelope>("GET", "/giftcardcampaigns", {
    query: userRef ? { userRef } : {},
  });
}

export async function issueGiftcard(body: IssueGiftcardBody, issueWiCode = true) {
  const payload = {
    ...body,
    campaignId: Number(body.campaignId),
    balance: Number(body.balance),
    stateId: body.stateId ?? "A",
  };
  return yoyoRequest<YoyoApiEnvelope>("POST", "/giftcards", {
    query: { issueWiCode: String(issueWiCode) },
    body: payload,
  });
}

/** Yoyo may return wiCode or wicode; HTTP 503 can be transient on sandbox. */
export async function issueGiftcardWithRetry(
  body: IssueGiftcardBody,
  issueWiCode = true,
  maxAttempts = 3
) {
  let last = await issueGiftcard(body, issueWiCode);
  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    const retryable =
      last.status === 503 ||
      last.status === 502 ||
      last.status === 0 ||
      (!isYoyoSuccess(last.data) &&
        !last.data.giftcard?.id &&
        (last.status >= 500 || last.status === 0));
    if (!retryable) break;
    await new Promise((r) => setTimeout(r, 400 * attempt));
    last = await issueGiftcard(body, issueWiCode);
  }
  return last;
}

function pickDateString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function normalizeGiftcard(
  raw: Record<string, unknown> | undefined
): YoyoGiftcard | undefined {
  if (!raw || raw.id == null) return undefined;
  const wiCode = (raw.wiCode ?? raw.wicode ?? raw.wiQR) as string | undefined;
  return {
    id: String(raw.id),
    balance: raw.balance != null ? Number(raw.balance) : undefined,
    wiCode: wiCode != null ? String(wiCode) : undefined,
    stateId: raw.stateId != null ? String(raw.stateId) : undefined,
    campaignId: raw.campaignId as number | string | undefined,
    expiryDate: pickDateString(raw.expiryDate, raw.expiry_date),
    createDate: pickDateString(raw.createDate, raw.create_date),
    redeemedAmount: raw.redeemedAmount != null ? Number(raw.redeemedAmount) : undefined,
    issuedAmount: raw.issuedAmount != null ? Number(raw.issuedAmount) : undefined,
  };
}

export async function getGiftcardById(giftcardId: string) {
  return yoyoRequest<YoyoApiEnvelope>("GET", `/giftcards/${encodeURIComponent(giftcardId)}`);
}

export async function listUserGiftcards(userRef: string) {
  return yoyoRequest<YoyoApiEnvelope>(
    "GET",
    `/user/${encodeURIComponent(userRef)}/giftcards`
  );
}

export function extractGiftcards(data: YoyoApiEnvelope | Record<string, unknown>): YoyoGiftcard[] {
  const envelope = data as YoyoApiEnvelope & { giftCards?: unknown };
  const rawList =
    envelope.giftcards ??
    envelope.giftCards ??
    (Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : null);

  if (Array.isArray(rawList)) {
    return rawList
      .map((item) => normalizeGiftcard(item as Record<string, unknown>))
      .filter((card): card is YoyoGiftcard => Boolean(card));
  }

  if (envelope.giftcard) {
    const single = normalizeGiftcard(envelope.giftcard as unknown as Record<string, unknown>);
    return single ? [single] : [];
  }

  return [];
}

export function extractCampaigns(data: YoyoApiEnvelope) {
  return data.giftcardCampaigns ?? data.campaigns ?? [];
}
