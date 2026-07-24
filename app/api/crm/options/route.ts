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

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractToken(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const token = data.token ?? data.access_token ?? data.jwt ?? data.id_token;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

async function resolveToken(): Promise<string | null> {
  const explicitToken = process.env.CRM_API_TOKEN?.trim();
  if (explicitToken) return explicitToken;

  const authUrl = resolveUrl("CRM_AUTH_URL", "CRM_AUTH_PATH", "/api-token-auth/");
  const username = process.env.CRM_USERNAME?.trim();
  const password = process.env.CRM_PASSWORD;
  if (!authUrl || !username || !password) return null;

  for (const url of [authUrl, authUrl.endsWith("/") ? authUrl : `${authUrl}/`]) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await readJsonOrText(response);
      if (response.ok) {
        const token = extractToken(body);
        if (token) return token;
      }
    } catch {
      // Try the next URL variant.
    }
  }

  return null;
}

function buildTokenHeaders(token: string): Record<string, string> {
  const header = process.env.CRM_TOKEN_HEADER || "Authorization";
  const prefix = process.env.CRM_TOKEN_PREFIX ?? "Token";
  return {
    Accept: "application/json",
    [header]: prefix ? `${prefix} ${token}` : token,
  };
}

function optionLabel(row: Record<string, unknown>): string {
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const surname = typeof row.surname === "string" ? row.surname.trim() : "";
  const email = typeof row.email === "string" ? row.email.trim() : "";
  const code = typeof row.code === "string" ? row.code.trim() : "";
  return [name, surname].filter(Boolean).join(" ") || email || code || `Adviser ${String(row.id)}`;
}

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "advisers") {
    return NextResponse.json({ success: false, message: "Unsupported CRM options type." }, { status: 400 });
  }

  const token = await resolveToken();
  const advisersUrl = resolveUrl("CRM_ADVISER_API_URL", "CRM_ADVISER_API_PATH", "/wealth/adviser/api/");
  if (!token || !advisersUrl) {
    return NextResponse.json({ success: false, options: [] });
  }

  const url = new URL(advisersUrl);
  url.searchParams.set("page_size", "200");
  const response = await fetch(url.toString(), { headers: buildTokenHeaders(token) });
  const body = await readJsonOrText(response);
  if (!response.ok) {
    return NextResponse.json({ success: false, options: [], status: response.status }, { status: 502 });
  }

  const rows = isRecord(body) && Array.isArray(body.results) ? body.results : Array.isArray(body) ? body : [];
  const options = rows
    .filter((row): row is Record<string, unknown> => isRecord(row) && (typeof row.id === "number" || typeof row.id === "string"))
    .map((row) => ({ value: String(row.id), label: optionLabel(row) }));

  return NextResponse.json({ success: true, options });
}
