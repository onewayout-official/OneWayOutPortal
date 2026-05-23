import { isYoyoSuccess } from "@/lib/yoyo/campaignMatch";
import type { IssueGiftcardBody, YoyoApiEnvelope, YoyoProxyResult } from "@/lib/yoyo/types";

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

export function normalizeGiftcard(
  raw: Record<string, unknown> | undefined
): { id: string; balance?: number; wiCode?: string; stateId?: string; campaignId?: number | string } | undefined {
  if (!raw || raw.id == null) return undefined;
  const wiCode = (raw.wiCode ?? raw.wicode ?? raw.wiQR) as string | undefined;
  return {
    id: String(raw.id),
    balance: raw.balance != null ? Number(raw.balance) : undefined,
    wiCode: wiCode != null ? String(wiCode) : undefined,
    stateId: raw.stateId as string | undefined,
    campaignId: raw.campaignId as number | string | undefined,
  };
}

export function extractCampaigns(data: YoyoApiEnvelope) {
  return data.giftcardCampaigns ?? data.campaigns ?? [];
}
