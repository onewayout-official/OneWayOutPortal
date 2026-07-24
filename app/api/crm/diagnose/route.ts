import { NextResponse } from "next/server";

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeBaseUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/g, "");
  return `https://${trimSlashes(value)}`;
}

function resolveBaseUrl(): string | null {
  const fromEnv = process.env.CRM_BASE_URL?.trim();
  if (fromEnv) return normalizeBaseUrl(fromEnv);
  const createUrl = process.env.CRM_CREATE_CLIENT_URL?.trim();
  if (!createUrl) return null;
  try {
    return new URL(createUrl).origin;
  } catch {
    return null;
  }
}

function resolveUrl(directEnvKey: string, pathEnvKey: string, fallbackPath: string): string | null {
  const direct = process.env[directEnvKey]?.trim();
  if (direct) return direct;
  const base = resolveBaseUrl();
  if (!base) return null;
  const path = process.env[pathEnvKey]?.trim() || fallbackPath;
  return `${base}/${trimSlashes(path)}`;
}

function buildHeadersForDebug(kind: "none" | "basic" | "token") {
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.CRM_API_KEY?.trim();
  if (apiKey) headers[process.env.CRM_API_KEY_HEADER || "x-api-key"] = apiKey;

  if (kind === "basic") {
    const b64 = process.env.CRM_BASIC_AUTH_B64?.trim();
    if (b64) headers["Authorization"] = `Basic ${b64}`;
  }

  if (kind === "token") {
    const prefix = process.env.CRM_TOKEN_PREFIX ?? "Token";
    const header = process.env.CRM_TOKEN_HEADER || "Authorization";
    // we do not include actual token here for safety; if CRM_API_TOKEN present we indicate that
    if (process.env.CRM_API_TOKEN?.trim()) headers[header] = `${prefix} [REDACTED]`;
  }

  return headers;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function tryTokenAuthAttempt(authUrl: string) {
  const username = process.env.CRM_USERNAME?.trim();
  const password = process.env.CRM_PASSWORD;
  if (!authUrl || !username || !password) return { tried: false };

  const body = JSON.stringify({ username, password, ...JSON.parse(process.env.CRM_AUTH_EXTRA_JSON || "{}") });
  try {
    const response = await fetch(authUrl, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body });
    const rb = await readJsonOrText(response);
    const snippet = typeof rb === "string" ? rb.slice(0, 1000) : JSON.stringify(rb || {}).slice(0, 1000);
    // try to detect token
    let tokenFound = false;
    if (typeof rb === "string") tokenFound = false;
    else if (rb && typeof rb === "object") {
      const keys = ["access_token", "token", "jwt", "id_token"];
      for (const k of keys) {
        // @ts-ignore
        if (rb[k]) { tokenFound = true; break; }
      }
    }
    return { tried: true, status: response.status, responseSnippet: snippet, tokenFound };
  } catch (err) {
    return { tried: true, failed: true, reason: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const organisationApiUrl = resolveUrl("CRM_ORGANISATION_API_URL", "CRM_ORGANISATION_API_PATH", "/configuration/organisation/api/");
  const authUrl = resolveUrl("CRM_AUTH_URL", "CRM_AUTH_PATH", "/api-token-auth/");

  const envOrgId = process.env.CRM_ORGANISATION_ID ?? null;
  const envTitleId = process.env.CRM_TITLE_ID ?? null;
  const basicB64 = process.env.CRM_BASIC_AUTH_B64 ? true : false;
  const apiTokenPresent = Boolean(process.env.CRM_API_TOKEN?.trim());

  const result: any = {
    organisationApiUrl,
    authUrl,
    env: {
      CRM_ORGANISATION_ID: envOrgId,
      CRM_TITLE_ID: envTitleId,
      CRM_BASIC_AUTH_B64: basicB64,
      CRM_API_TOKEN_PRESENT: apiTokenPresent,
    },
  };

  if (!organisationApiUrl) {
    result.error = "Could not resolve organisation API URL from CRM_BASE_URL or CRM_ORGANISATION_API_URL";
    return NextResponse.json(result, { status: 400 });
  }

  // Try lookup with basic if present, otherwise none
  const initialAuthKind: "basic" | "none" = basicB64 ? "basic" : "none";
  try {
    const headers = buildHeadersForDebug(initialAuthKind);
    const url = new URL(organisationApiUrl);
    url.searchParams.set("page_size", "5");
    url.searchParams.set("search", process.env.CRM_ORGANISATION_NAME || "");
    const res = await fetch(url.toString(), { method: "GET", headers });
    const rb = await readJsonOrText(res);
    result.initialLookup = { authTried: initialAuthKind, status: res.status, responseSnippet: typeof rb === "string" ? rb.slice(0, 1000) : JSON.stringify(rb || {}).slice(0, 1000) };
  } catch (err) {
    result.initialLookup = { authTried: initialAuthKind, error: err instanceof Error ? err.message : String(err) };
  }

  // If initial returned 401/403, try token auth
  if (!result.initialLookup || (result.initialLookup.status && (result.initialLookup.status === 401 || result.initialLookup.status === 403))) {
    const tokenAttempt = await tryTokenAuthAttempt(authUrl || "");
    result.tokenAuthAttempt = tokenAttempt;
    if (tokenAttempt && tokenAttempt.tokenFound && tokenAttempt.tried) {
      // try lookup with token header
      try {
        const headers = buildHeadersForDebug("token");
        const url = new URL(organisationApiUrl);
        url.searchParams.set("page_size", "5");
        url.searchParams.set("search", process.env.CRM_ORGANISATION_NAME || "");
        const res2 = await fetch(url.toString(), { method: "GET", headers });
        const rb2 = await readJsonOrText(res2);
        result.tokenLookup = { status: res2.status, responseSnippet: typeof rb2 === "string" ? rb2.slice(0, 1000) : JSON.stringify(rb2 || {}).slice(0, 1000) };
      } catch (err) {
        result.tokenLookup = { error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  return NextResponse.json(result);
}
