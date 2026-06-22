import { NextResponse } from "next/server";
import type { CrmSyncPayload, CrmSyncResponse } from "@/lib/crmSync";

const truthy = new Set(["1", "true", "yes", "on"]);
const inFlightSyncKeys = new Set<string>();

interface CrmAuth {
  kind: "none" | "basic" | "token";
  value?: string;
}

interface CreateClientRequestResult {
  response: Response;
  responseBody: unknown;
  requestHeaders: Record<string, string>;
}

interface CreateClientPayloadAttempt {
  label: string;
  payload: Record<string, unknown>;
}

interface CrmRequestResult {
  response: Response;
  responseBody: unknown;
  requestHeaders: Record<string, string>;
  authUsed: CrmAuth;
}

class CrmError extends Error {
  url?: string;
  status?: number;
  responseBody?: unknown;
  authUsed?: string;
  constructor(message: string, props?: { url?: string; status?: number; responseBody?: unknown; authUsed?: string }) {
    super(message);
    this.name = "CrmError";
    if (props) {
      this.url = props.url;
      this.status = props.status;
      this.responseBody = props.responseBody;
      this.authUsed = props.authUsed;
    }
  }
}

interface Phase2EntitySummary {
  created: number;
  updated: number;
  deleted: number;
  failed: number;
  payload?: Record<string, unknown>;
  response?: unknown;
  errors?: Array<{
    operation: string;
    status?: number;
    response?: unknown;
    reason?: string;
  }>;
}

interface Phase2SyncSummary {
  income: Phase2EntitySummary;
  expenses: Phase2EntitySummary;
  portfolio: Phase2EntitySummary;
  banking: Phase2EntitySummary;
}

interface Phase2DesiredRecord {
  syncKey: string;
  payload: Record<string, unknown>;
}

const CRM_MARITAL_STATUS_VALUES = new Set([
  "unknown",
  "unmarried",
  "married_in_cop",
  "married_out_cop_w_accrual",
  "married_out_cop",
  "common_law",
  "divorced",
  "widowed",
  "married_unknown",
]);

const CRM_SOURCE_OF_WEALTH_VALUES = new Set([
  "accumulated_savings",
  "sale_of_assets",
  "investment_returns",
  "inheritance_donations",
  "court_orders_settlements",
  "legitimate_winnings",
]);

const CRM_INDUSTRY_CLASSIFICATION_VALUES = new Set([
  "accounting_auditing",
  "agriculture_farming",
  "cash_forex_crypto",
  "charitable_religious",
  "construction_real_estate",
  "education",
  "engineering",
  "financial_services",
  "government_military",
  "hospitality_sport_entertainment",
  "legal_practitioners",
  "medical_healthcare",
  "retail_manufacturing_industrial",
  "retiree",
  "technology",
  "transport_logistics",
  "unemployed",
]);

const CRM_PHASE2_SYNC_SOURCE = "onewayout_phase2_sync";

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return truthy.has(value.trim().toLowerCase());
}

function isEnabledByDefault(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (!value.trim()) return fallback;
  return truthy.has(value.trim().toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOptionalObject(json: string | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

function parsePositiveInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  }
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toDecimalString(value: unknown): string | undefined {
  const parsed = parseNumber(value);
  if (parsed === undefined) return undefined;
  return parsed.toFixed(2);
}

function toIsoDateString(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function cleanOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeSourceOfWealth(value: unknown): string | undefined {
  const cleaned = cleanOptionalText(value)?.toLowerCase();
  if (!cleaned) return undefined;
  return CRM_SOURCE_OF_WEALTH_VALUES.has(cleaned) ? cleaned : undefined;
}

function normalizeIndustryClassification(value: unknown): string | undefined {
  const cleaned = cleanOptionalText(value)?.toLowerCase();
  if (!cleaned) return undefined;
  return CRM_INDUSTRY_CLASSIFICATION_VALUES.has(cleaned) ? cleaned : undefined;
}

function normalizeMaritalStatus(value: unknown): string | undefined {
  const cleaned = cleanOptionalText(value)?.toLowerCase();
  if (!cleaned) return undefined;
  return CRM_MARITAL_STATUS_VALUES.has(cleaned) ? cleaned : undefined;
}

function normalizeGender(value: unknown): "Male" | "Female" | "Other" | undefined {
  const cleaned = cleanOptionalText(value)?.toLowerCase();
  if (!cleaned) return undefined;
  if (cleaned === "male") return "Male";
  if (cleaned === "female") return "Female";
  if (cleaned === "other") return "Other";
  return undefined;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

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

function ensureTrailingSlash(url: string | null): string | null {
  if (!url) return null;
  const parsed = new URL(url);
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  return parsed.toString();
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

function deepToLowerText(input: unknown): string {
  if (typeof input === "string") return input.toLowerCase();
  if (Array.isArray(input)) return input.map((value) => deepToLowerText(value)).join(" ");
  if (isRecord(input)) return Object.values(input).map((value) => deepToLowerText(value)).join(" ");
  return "";
}

function isDuplicateClientResponse(input: unknown): boolean {
  const text = deepToLowerText(input);
  if (!text) return false;
  return (
    text.includes("already exists") ||
    text.includes("duplicate") ||
    text.includes("already registered") ||
    text.includes("already taken") ||
    text.includes("existing client")
  );
}

function extractToken(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (!isRecord(data)) return null;

  const directKeys = ["access_token", "token", "jwt", "id_token"];
  for (const key of directKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  const nestedKeys = ["data", "result", "payload"];
  for (const key of nestedKeys) {
    const nested = data[key];
    if (!isRecord(nested)) continue;
    for (const nestedKey of directKeys) {
      const value = nested[nestedKey];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  return null;
}

function extractClientId(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined;

  const directKeys = ["id", "client_id", "clientId", "uuid", "reference"];
  for (const key of directKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  const nestedKeys = ["data", "result", "payload"];
  for (const key of nestedKeys) {
    const nested = data[key];
    if (!isRecord(nested)) continue;
    for (const nestedKey of directKeys) {
      const value = nested[nestedKey];
      if (typeof value === "string" && value.trim()) return value;
      if (typeof value === "number") return String(value);
    }
  }

  return undefined;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => isRecord(item));
}

function sumPersonalAmount<T extends { personal: number }>(rows: T[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.personal) || 0), 0);
}

function getBestMonthlyIncome(payload: CrmSyncPayload): number | undefined {
  const fromLastIncome = parseNumber(payload.profile.lastIncome);
  if (fromLastIncome !== undefined && fromLastIncome > 0) return fromLastIncome;

  const fromMonthlyIncome = parseNumber(payload.profile.monthlyIncome);
  if (fromMonthlyIncome !== undefined && fromMonthlyIncome > 0) return fromMonthlyIncome;

  const fromOnboardingRows = sumPersonalAmount(payload.onboarding.income);
  if (fromOnboardingRows > 0) return fromOnboardingRows;

  return undefined;
}

function deriveEmployer(payload: CrmSyncPayload): string | undefined {
  const match = payload.onboarding.income.find((entry) => {
    const category = entry.category?.toLowerCase();
    const name = entry.name?.trim();
    return (category === "salary" || category === "business income") && !!name;
  });
  return match?.name?.trim() || undefined;
}

function splitName(name: string, fallbackEmail: string): { fullName: string; surname?: string } {
  const trimmed = name.trim();
  const fallback = fallbackEmail.split("@")[0] || "Client";
  const fullName = trimmed || fallback;
  const parts = fullName.split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts.slice(1).join(" ") : undefined;

  return { fullName, surname };
}

function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
  return cleaned as T;
}

function sanitizeCrmProfileData(input: unknown): Record<string, string | number | boolean> {
  if (!isRecord(input)) return {};
  const protectedKeys = new Set([
    "id",
    "created_at",
    "updated_at",
    "extra_data",
    "organisation",
    "title",
    "client_type",
    "unique_client_id",
    "get_content_type_id",
    "get_instance_documents_json",
    "clientbanking_set-0-account_holder",
    "clientbanking_set-0-bank",
    "clientbanking_set-0-bank_name",
    "clientbanking_set-0-branch_code",
    "clientbanking_set-0-account_type",
    "clientbanking_set-0-account_number",
  ]);
  const positiveIntegerKeys = new Set([
    "adviser",
    "adviser_1",
    "adviser_2",
    "adviser_3",
    "client_category",
    "client_status",
    "country",
    "id_country",
    "industry",
    "physical_address_city",
    "physical_address_state_province",
    "portal_settings",
    "postal_address_city",
    "postal_address_state_province",
    "risk_level",
    "source_of_income",
  ]);

  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (protectedKeys.has(key)) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (positiveIntegerKeys.has(key)) {
        const parsed = Number(trimmed);
        if (Number.isInteger(parsed) && parsed > 0) {
          output[key] = parsed;
        } else if (trimmed) {
          console.warn("[crm-sync] skipping invalid CRM FK/id field", { key, value: trimmed });
        }
        continue;
      }
      if (trimmed) output[key] = trimmed;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      if (positiveIntegerKeys.has(key) && (!Number.isInteger(value) || value <= 0)) {
        console.warn("[crm-sync] skipping invalid CRM FK/id field", { key, value });
        continue;
      }
      output[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      output[key] = value;
    }
  }
  return output;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableCreateFailure(status: number, responseBody: unknown): boolean {
  if ([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526].includes(status)) return true;
  if (!isRecord(responseBody)) return false;
  return responseBody.retryable === true;
}

function getRetryDelayMs(response: Response, responseBody: unknown, attempt: number): number {
  const fromHeader = parsePositiveInteger(response.headers.get("retry-after"));
  if (fromHeader !== undefined) return Math.min(Math.max(fromHeader, 1), 120) * 1000;

  if (isRecord(responseBody)) {
    const fromBody = parsePositiveInteger(responseBody.retry_after);
    if (fromBody !== undefined) return Math.min(Math.max(fromBody, 1), 120) * 1000;
  }

  const fallbackSeconds = Math.min(5 * attempt, 30);
  return fallbackSeconds * 1000;
}

function buildHeaders(auth: CrmAuth, contentType = "application/json"): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": contentType,
  };

  const apiKey = process.env.CRM_API_KEY?.trim();
  if (apiKey) {
    headers[process.env.CRM_API_KEY_HEADER || "x-api-key"] = apiKey;
  }

  if (auth.kind === "basic" && auth.value) {
    headers.Authorization = `Basic ${auth.value}`;
  }

  if (auth.kind === "token" && auth.value) {
    const tokenHeader = process.env.CRM_TOKEN_HEADER || "Authorization";
    const prefix = process.env.CRM_TOKEN_PREFIX ?? "Token";
    headers[tokenHeader] = prefix ? `${prefix} ${auth.value}` : auth.value;
  }

  return headers;
}

function buildClientDetailUrl(listUrl: string, clientId: string): string {
  const url = new URL(listUrl);
  url.search = "";
  const basePath = url.pathname.replace(/\/+$/g, "");
  url.pathname = `${basePath}/${encodeURIComponent(clientId)}/`;
  return url.toString();
}

function getBasicCredentialValue(): string | null {
  const directB64 = process.env.CRM_BASIC_AUTH_B64?.trim();
  if (directB64) return directB64;

  const username = process.env.CRM_USERNAME?.trim();
  const password = process.env.CRM_PASSWORD;
  if (!username || !password) return null;
  return Buffer.from(`${username}:${password}`).toString("base64");
}

function getUrlVariants(url: string): string[] {
  const variants = new Set<string>([url]);
  if (url.endsWith("/")) {
    variants.add(url.slice(0, -1));
  } else {
    variants.add(`${url}/`);
  }
  return Array.from(variants);
}

async function tryResolveTokenAuth(): Promise<CrmAuth | null> {
  if (process.env.CRM_API_TOKEN?.trim()) {
    console.info("[crm-sync] using CRM_API_TOKEN from env (token auth)");
    return { kind: "token", value: process.env.CRM_API_TOKEN.trim() };
  }

  const authUrl = resolveUrl("CRM_AUTH_URL", "CRM_AUTH_PATH", "/api-token-auth/");
  const username = process.env.CRM_USERNAME?.trim();
  const password = process.env.CRM_PASSWORD;
  if (!authUrl || !username || !password) {
    console.info("[crm-sync] token auth not configured (missing CRM_AUTH_URL/USERNAME/PASSWORD)");
    return null;
  }

  console.info("[crm-sync] attempting token auth via auth endpoint", { authUrl: authUrl, userPresent: Boolean(username) });

  const basic = getBasicCredentialValue();
  const body = JSON.stringify({ username, password, ...parseOptionalObject(process.env.CRM_AUTH_EXTRA_JSON) });

  for (const variant of getUrlVariants(authUrl)) {
    const headerModes: CrmAuth[] = basic ? [{ kind: "basic", value: basic }, { kind: "none" }] : [{ kind: "none" }];

    for (const authMode of headerModes) {
      try {
        const response = await fetch(variant, {
          method: "POST",
          headers: buildHeaders(authMode),
          body,
        });
        const responseBody = await readJsonOrText(response);

        console.info("[crm-sync] auth endpoint response", {
          url: variant,
          status: response.status,
          auth_mode_tried: authMode.kind,
          response_snippet: typeof responseBody === "string" ? responseBody.slice(0, 500) : JSON.stringify(responseBody || {}).slice(0, 500),
        });

        if (response.ok) {
          const token = extractToken(responseBody);
          if (token) {
            console.info("[crm-sync] obtained token via auth endpoint (token redacted)");
            return { kind: "token", value: token };
          }
        }
      } catch (err) {
        console.warn("[crm-sync] auth endpoint request failed, trying next candidate", { url: variant, auth_mode_tried: authMode.kind, reason: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  return null;
}

async function resolveAuth(): Promise<CrmAuth> {
  const explicitToken = process.env.CRM_API_TOKEN?.trim();
  if (explicitToken) {
    console.info("[crm-sync] resolveAuth: using explicit CRM_API_TOKEN from env");
    return { kind: "token", value: explicitToken };
  }

  const authMode = (process.env.CRM_AUTH_MODE || "").toLowerCase();
  const preferToken = authMode === "basic" ? isEnabled(process.env.CRM_USE_TOKEN_AUTH) : true;
  if (preferToken) {
    console.info("[crm-sync] resolveAuth: attempting token auth before fallback");
    const tokenAuth = await tryResolveTokenAuth();
    if (tokenAuth) return tokenAuth;
  }

  const basic = getBasicCredentialValue();
  if (basic) {
    console.info("[crm-sync] resolveAuth: using basic auth from env (basic auth b64 present)");
    return { kind: "basic", value: basic };
  }

  console.info("[crm-sync] resolveAuth: no auth configured, proceeding with none");
  return { kind: "none" };
}

async function getLookupRows(url: string, auth: CrmAuth, searchValue?: string): Promise<Record<string, unknown>[]> {
  const uri = new URL(url);
  uri.searchParams.set("page_size", "200");
  if (searchValue && searchValue.trim()) {
    uri.searchParams.set("search", searchValue.trim());
  }

  const response = await fetch(uri.toString(), {
    method: "GET",
    headers: buildHeaders(auth),
  });

  const responseBody = await readJsonOrText(response);
  if (!response.ok) {
    const msg =
      response.status === 401 || response.status === 403
        ? `CRM lookup unauthorized at ${uri.pathname}. Set CRM_ORGANISATION_ID and CRM_TITLE_ID in .env.local to skip lookup calls.`
        : `CRM lookup failed (${uri.pathname}) with HTTP ${response.status}.`;

    // Log useful information (truncate response body) but avoid sensitive headers/tokens
    try {
      const snippet = typeof responseBody === "string" ? responseBody.slice(0, 2000) : JSON.stringify(responseBody).slice(0, 2000);
      console.error("[crm-sync] CRM lookup error", { url: uri.toString(), status: response.status, auth_mode: auth.kind, response_snippet: snippet });
    } catch {
      console.error("[crm-sync] CRM lookup error", { url: uri.toString(), status: response.status, auth_mode: auth.kind });
    }

    throw new CrmError(msg, { url: uri.toString(), status: response.status, responseBody, authUsed: auth.kind });
  }

  if (isRecord(responseBody) && Array.isArray(responseBody.results)) {
    return asRecordArray(responseBody.results);
  }

  return asRecordArray(responseBody);
}

function pickIdFromRows(rows: Record<string, unknown>[], textKeys: string[], targetText?: string): number | undefined {
  const parseId = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isInteger(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isInteger(parsed)) return parsed;
    }
    return undefined;
  };

  if (targetText) {
    const wanted = normalizeText(targetText);
    for (const row of rows) {
      for (const key of textKeys) {
        const value = row[key];
        if (typeof value === "string" && normalizeText(value) === wanted) {
          const id = parseId(row.id);
          if (id !== undefined) return id;
        }
      }
    }
  }

  for (const row of rows) {
    const id = parseId(row.id);
    if (id !== undefined) return id;
  }

  return undefined;
}

async function resolveOrganisationId(auth: CrmAuth): Promise<number> {
  const rawEnv = process.env.CRM_ORGANISATION_ID;
  const fromEnv = parseInteger(rawEnv);
  const organisationApiUrl = resolveUrl("CRM_ORGANISATION_API_URL", "CRM_ORGANISATION_API_PATH", "/configuration/organisation/api/");
  if (!organisationApiUrl) {
    throw new CrmError("Could not resolve organisation API URL. Set CRM_ORGANISATION_ID or CRM_BASE_URL.", { url: undefined });
  }

  if (fromEnv !== undefined) {
    const detailUrl = buildClientDetailUrl(organisationApiUrl, String(fromEnv));
    const response = await fetch(detailUrl, {
      method: "GET",
      headers: buildHeaders(auth),
    });

    if (response.ok) {
      console.info("[crm-sync] using validated CRM_ORGANISATION_ID from env", { raw: rawEnv });
      return fromEnv;
    }

    const responseBody = await readJsonOrText(response);
    console.warn("[crm-sync] CRM_ORGANISATION_ID from env is not valid; falling back to lookup", {
      raw: rawEnv,
      status: response.status,
      response_snippet: typeof responseBody === "string" ? responseBody.slice(0, 500) : JSON.stringify(responseBody || {}).slice(0, 500),
    });
  }

  console.info("[crm-sync] CRM_ORGANISATION_ID not set/valid; performing lookup");
  console.info("[crm-sync] organisation lookup URL", { url: organisationApiUrl, searchName: process.env.CRM_ORGANISATION_NAME ?? null });
  const rows = await getLookupRows(organisationApiUrl, auth, process.env.CRM_ORGANISATION_NAME);
  const id = pickIdFromRows(rows, ["name"], process.env.CRM_ORGANISATION_NAME);
  if (id === undefined) {
    throw new CrmError("Could not resolve organisation ID. Set CRM_ORGANISATION_ID explicitly.", { url: organisationApiUrl, responseBody: rows });
  }

  console.info("[crm-sync] resolved organisation id via lookup", { organisationId: id });
  return id;
}

async function resolveTitleId(auth: CrmAuth): Promise<number> {
  const rawEnv = process.env.CRM_TITLE_ID;
  const fromEnv = parseInteger(rawEnv);
  if (fromEnv !== undefined) {
    console.info("[crm-sync] using CRM_TITLE_ID from env", { raw: rawEnv });
    return fromEnv;
  }

  console.info("[crm-sync] CRM_TITLE_ID not set or invalid; performing lookup");
  const titleApiUrl = resolveUrl("CRM_TITLE_API_URL", "CRM_TITLE_API_PATH", "/configuration/title/api/");
  if (!titleApiUrl) {
    throw new CrmError("Could not resolve title API URL. Set CRM_TITLE_ID or CRM_BASE_URL.", { url: undefined });
  }

  const titleValue = process.env.CRM_TITLE_VALUE || "Mr";
  console.info("[crm-sync] title lookup URL", { url: titleApiUrl, titleValue });
  const rows = await getLookupRows(titleApiUrl, auth, titleValue);
  const id = pickIdFromRows(rows, ["title", "abbreviation"], titleValue);
  if (id === undefined) {
    throw new CrmError("Could not resolve title ID. Set CRM_TITLE_ID explicitly.", { url: titleApiUrl, responseBody: rows });
  }

  console.info("[crm-sync] resolved title id via lookup", { titleId: id });
  return id;
}

async function resolveClientTypeId(auth: CrmAuth): Promise<number | undefined> {
  const fromEnv = parseInteger(process.env.CRM_CLIENT_TYPE_ID);
  if (fromEnv !== undefined) return fromEnv;

  const strictLookup = isEnabledByDefault(process.env.CRM_REQUIRE_CLIENT_TYPE_ID, true);
  const clientTypeApiUrl = resolveUrl("CRM_CLIENT_TYPE_API_URL", "CRM_CLIENT_TYPE_API_PATH", "/wealth/clienttype/api/");
  if (!clientTypeApiUrl) {
    if (strictLookup) {
      throw new Error("Could not resolve client type API URL. Set CRM_CLIENT_TYPE_ID or CRM_BASE_URL.");
    }
    return undefined;
  }

  try {
    const targetClientType = process.env.CRM_CLIENT_TYPE_VALUE || "individual";
    const rows = await getLookupRows(clientTypeApiUrl, auth, targetClientType);
    const exactIndividual = rows.find((row) => {
      const internalType = row.internal_type;
      return typeof internalType === "string" && normalizeText(internalType) === "individual";
    });

    let resolvedId: number | undefined;
    if (exactIndividual && typeof exactIndividual.id === "number") resolvedId = exactIndividual.id;
    if (exactIndividual && typeof exactIndividual.id === "string") {
      const parsed = Number(exactIndividual.id);
      if (Number.isInteger(parsed)) resolvedId = parsed;
    }

    if (resolvedId === undefined) {
      resolvedId = pickIdFromRows(rows, ["client_type", "internal_type"], targetClientType);
    }

    if (resolvedId !== undefined) {
      return resolvedId;
    }

    if (strictLookup) {
      throw new Error("Could not resolve client type ID. Set CRM_CLIENT_TYPE_ID explicitly.");
    }

    return undefined;
  } catch (error) {
    if (strictLookup) {
      const message = error instanceof Error ? error.message : "Unknown client type lookup error.";
      throw new Error(`CRM client type lookup failed. ${message} Set CRM_CLIENT_TYPE_ID in .env.local to bypass lookup.`);
    }
    return undefined;
  }
}

function extractRowId(row: Record<string, unknown>): string | undefined {
  const id = row.id;
  if (typeof id === "number") return String(id);
  if (typeof id === "string" && id.trim()) return id;
  return undefined;
}

function extractRowsAndNextUrl(
  responseBody: unknown,
  currentUrl: string
): { rows: Record<string, unknown>[]; nextUrl?: string } {
  if (!isRecord(responseBody)) {
    return { rows: asRecordArray(responseBody) };
  }

  const rows = Array.isArray(responseBody.results) ? asRecordArray(responseBody.results) : asRecordArray(responseBody);
  const next = responseBody.next;
  if (typeof next === "string" && next.trim()) {
    try {
      return { rows, nextUrl: new URL(next, currentUrl).toString() };
    } catch {
      return { rows };
    }
  }

  return { rows };
}

function isPaginatedListResponse(responseBody: unknown): boolean {
  return isRecord(responseBody) && Array.isArray(responseBody.results) && typeof responseBody.count === "number";
}

function rowMatchesIdentity(
  row: Record<string, unknown>,
  wantedEmail: string,
  wantedExternalId?: string
): boolean {
  const personalEmail = row.personal_email;
  if (typeof personalEmail === "string" && normalizeText(personalEmail) === wantedEmail) {
    return true;
  }

  if (!wantedExternalId) return false;

  const uniqueClientId = row.unique_client_id;
  if (typeof uniqueClientId === "string" && normalizeText(uniqueClientId) === wantedExternalId) {
    return true;
  }

  const extraData = row.extra_data;
  if (isRecord(extraData)) {
    const externalUserId = extraData.external_user_id;
    if (typeof externalUserId === "string" && normalizeText(externalUserId) === wantedExternalId) {
      return true;
    }
  }

  return false;
}

async function findExistingClientIdByEmail(
  createUrl: string,
  email: string,
  externalUserId: string | undefined,
  auth: CrmAuth
): Promise<string | undefined> {
  const wantedEmail = normalizeText(email);
  const wantedExternalId = externalUserId?.trim() ? normalizeText(externalUserId) : undefined;
  const pageSize = Math.max(20, parsePositiveInteger(process.env.CRM_EXISTING_SCAN_PAGE_SIZE) ?? 200);
  const maxPages = Math.max(1, parsePositiveInteger(process.env.CRM_EXISTING_SCAN_MAX_PAGES) ?? 20);

  const scanCandidate = async (initialUrl: string): Promise<string | undefined> => {
    let nextUrl: string | undefined = initialUrl;
    const visited = new Set<string>();

    for (let page = 1; nextUrl && page <= maxPages; page++) {
      if (visited.has(nextUrl)) break;
      visited.add(nextUrl);

      const response = await fetch(nextUrl, {
        method: "GET",
        headers: buildHeaders(auth),
      });
      if (!response.ok) return undefined;

      const body = await readJsonOrText(response);
      const { rows, nextUrl: discoveredNextUrl } = extractRowsAndNextUrl(body, nextUrl);
      const match = rows.find((row) => rowMatchesIdentity(row, wantedEmail, wantedExternalId));
      if (match) {
        return extractRowId(match);
      }

      nextUrl = discoveredNextUrl;
    }

    return undefined;
  };

  const exactFilterCandidates: Array<{ key: string; value: string }> = [];
  if (externalUserId?.trim()) {
    exactFilterCandidates.push({ key: "unique_client_id", value: externalUserId.trim() });
  }
  exactFilterCandidates.push({ key: "personal_email", value: email.trim() });

  for (const candidate of exactFilterCandidates) {
    const uri = new URL(createUrl);
    uri.searchParams.set("page_size", String(pageSize));
    uri.searchParams.set(candidate.key, candidate.value);
    const matchId = await scanCandidate(uri.toString());
    if (matchId) return matchId;
    const executeLookup = async (candidateAuth: CrmAuth): Promise<{ response: Response; responseBody: unknown } | null> => {
        try {
          console.info("[crm-sync] performing lookup", { url: uri.toString(), auth_mode: candidateAuth.kind, filter_key: candidate.key, filter_value: candidate.value });
          const response = await fetch(uri.toString(), {
            method: "GET",
            headers: buildHeaders(candidateAuth),
          });
          const responseBody = await readJsonOrText(response);
          console.info("[crm-sync] lookup response", { url: uri.toString(), status: response.status, auth_mode: candidateAuth.kind, response_snippet: typeof responseBody === "string" ? responseBody.slice(0, 500) : JSON.stringify(responseBody || {}).slice(0, 500) });
          return { response, responseBody };
        } catch (err) {
          console.warn("[crm-sync] lookup request failed", { url: uri.toString(), auth_mode: candidateAuth.kind, reason: err instanceof Error ? err.message : String(err) });
          return null;
        }
      };

      // First attempt with provided auth
      let result = await executeLookup(auth);
      if (!result) {
        throw new CrmError("CRM lookup request failed (network or fetch error).", { url: uri.toString() });
      }

      if (!result.response.ok) {
        // If unauthorized with basic/none, try token auth once
        if ((result.response.status === 401 || result.response.status === 403) && auth.kind !== "token") {
          console.info("[crm-sync] lookup returned 401/403; attempting token auth fallback for lookup");
          const tokenAuth = await tryResolveTokenAuth();
          if (tokenAuth && tokenAuth.kind === "token") {
            const tokenResult = await executeLookup(tokenAuth);
            if (tokenResult && tokenResult.response.ok) {
              result = tokenResult;
            } else {
              const snippet = tokenResult?.responseBody ? (typeof tokenResult.responseBody === "string" ? tokenResult.responseBody.slice(0, 2000) : JSON.stringify(tokenResult.responseBody).slice(0, 2000)) : null;
              console.error("[crm-sync] token fallback for lookup failed", { url: uri.toString(), status: tokenResult?.response.status ?? null, response_snippet: snippet });
            }
          }
        }
      }

      if (!result.response.ok) {
        const snippet = typeof result.responseBody === "string" ? result.responseBody.slice(0, 2000) : JSON.stringify(result.responseBody || {}).slice(0, 2000);
        console.error("[crm-sync] final lookup error", { url: uri.toString(), status: result.response.status, response_snippet: snippet });
        throw new CrmError(`CRM lookup failed (${uri.pathname}) with HTTP ${result.response.status}.`, { url: uri.toString(), status: result.response.status, responseBody: result.responseBody });
      }

      const rows = isRecord(result.responseBody) && Array.isArray(result.responseBody.results)
        ? asRecordArray(result.responseBody.results)
        : asRecordArray(result.responseBody);
      const matchedRow = rows.find((row) => rowMatchesIdentity(row, wantedEmail, wantedExternalId));
      if (matchedRow) {
        return extractRowId(matchedRow);
      }

      return undefined;
    }

  return undefined;
}

function buildIndividualClientPayload(payload: CrmSyncPayload, organisationId: number, titleId: number, clientTypeId?: number): Record<string, unknown> {
  const { fullName, surname } = splitName(payload.profile.name || "", payload.profile.email || "client@example.com");
  const monthlyIncome = getBestMonthlyIncome(payload);
  const annualIncome = monthlyIncome !== undefined ? monthlyIncome * 12 : undefined;
  const onboardingIncomeTotal = sumPersonalAmount(payload.onboarding.income);
  const onboardingExpenseTotal = sumPersonalAmount(payload.onboarding.expenses);
  const onboardingAssetTotal = sumPersonalAmount(payload.onboarding.assets);
  const onboardingLiabilityTotal = sumPersonalAmount(payload.onboarding.liabilities);
  const profileCreatedDate = toIsoDateString(payload.profile.createdAt);
  const employer = cleanOptionalText(payload.profile.employer) || deriveEmployer(payload);
  const maritalStatus = normalizeMaritalStatus(payload.profile.maritalStatus) || "unknown";
  const sourceOfWealth =
    normalizeSourceOfWealth(payload.profile.sourceOfWealth) ??
    (payload.profile.capital && payload.profile.capital > 0 ? "accumulated_savings" : undefined);
  const industryClassification = normalizeIndustryClassification(payload.profile.industryClassification);
  const workEmail = cleanOptionalText(payload.profile.workEmail) || payload.profile.email;

  const includeRawOnboarding = isEnabled(process.env.CRM_INCLUDE_RAW_ONBOARDING_DATA);
  const crmProfileData = sanitizeCrmProfileData(payload.profile.crmProfileData);
  const extraDataBase: Record<string, unknown> = {
    external_user_id: payload.profile.id,
    sync_stage: payload.syncStage ?? "onboarding",
    onboarding_summary: {
      income_count: payload.onboarding.income.length,
      expense_count: payload.onboarding.expenses.length,
      asset_count: payload.onboarding.assets.length,
      liability_count: payload.onboarding.liabilities.length,
      income_total: onboardingIncomeTotal,
      expenses_total: onboardingExpenseTotal,
      assets_total: onboardingAssetTotal,
      liabilities_total: onboardingLiabilityTotal,
    },
  };
  if (includeRawOnboarding) {
    extraDataBase.onboarding = payload.onboarding;
  }

  const mapped = {
    organisation: organisationId,
    title: titleId,
    client_type: clientTypeId,
    unique_client_id: payload.profile.id,
    full_name: fullName,
    surname,
    initials: cleanOptionalText(payload.profile.initials),
    id_full_name: fullName,
    preferred_name: payload.profile.name?.trim() || undefined,
    personal_email: payload.profile.email,
    work_email: workEmail,
    mobile_number: payload.profile.phone,
    work_number: cleanOptionalText(payload.profile.workNumber),
    home_number: cleanOptionalText(payload.profile.homeNumber),
    date_of_birth: toIsoDateString(payload.profile.dateOfBirth),
    date_of_marriage: toIsoDateString(payload.profile.dateOfMarriage),
    gender: normalizeGender(payload.profile.gender),
    annual_income: toDecimalString(annualIncome),
    estimated_aum: toDecimalString(payload.profile.capital),
    accrual_start_value: toDecimalString(payload.profile.capital),
    employer,
    occupation: cleanOptionalText(payload.profile.occupation),
    highest_qualification: cleanOptionalText(payload.profile.highestQualification),
    client_inception_date: profileCreatedDate,
    client_relationship_date: profileCreatedDate,
    marital_status: maritalStatus,
    id_number: cleanOptionalText(payload.profile.idNumber),
    tax_number: cleanOptionalText(payload.profile.taxNumber),
    residency: "resident",
    language: "english",
    source_of_wealth: sourceOfWealth,
    industry_classification: industryClassification,
    send_sms: Boolean(payload.profile.phone?.trim()),
    send_email: true,
    notes:
      payload.syncStage === "onboarding"
        ? `Imported from OneWayOut onboarding. Income ${onboardingIncomeTotal.toFixed(2)}, Expenses ${onboardingExpenseTotal.toFixed(2)}, Assets ${onboardingAssetTotal.toFixed(2)}, Liabilities ${onboardingLiabilityTotal.toFixed(2)}.`
        : undefined,
    extra_data: extraDataBase,
  };

  return pruneUndefined({ ...mapped, ...crmProfileData });
}

function buildMinimalClientPayload(
  payload: CrmSyncPayload,
  organisationId: number,
  titleId: number,
  clientTypeId?: number
): Record<string, unknown> {
  const { fullName, surname } = splitName(payload.profile.name || "", payload.profile.email || "client@example.com");

  return pruneUndefined({
    organisation: organisationId,
    title: titleId,
    client_type: clientTypeId,
    unique_client_id: payload.profile.id,
    full_name: fullName,
    surname,
    personal_email: payload.profile.email,
    mobile_number: payload.profile.phone,
  });
}

function buildRequiredOnlyClientPayload(
  payload: CrmSyncPayload,
  organisationId: number,
  titleId: number,
  clientTypeId?: number
): Record<string, unknown> {
  const { fullName } = splitName(payload.profile.name || "", payload.profile.email || "client@example.com");
  return pruneUndefined({
    organisation: organisationId,
    title: titleId,
    client_type: clientTypeId,
    unique_client_id: payload.profile.id,
    full_name: fullName,
    personal_email: payload.profile.email,
  });
}

function buildCreatePayloadAttempts(
  payload: CrmSyncPayload,
  organisationId: number,
  titleId: number,
  clientTypeId: number | undefined,
  defaultFields: Record<string, unknown>
): CreateClientPayloadAttempt[] {
  const richPayload = {
    ...buildIndividualClientPayload(payload, organisationId, titleId, clientTypeId),
    ...defaultFields,
  };
  const minimalPayload = {
    ...buildMinimalClientPayload(payload, organisationId, titleId, clientTypeId),
    ...defaultFields,
  };
  const requiredPayload = buildRequiredOnlyClientPayload(payload, organisationId, titleId, clientTypeId);

  const attempts: CreateClientPayloadAttempt[] = [
    { label: "rich", payload: richPayload },
    { label: "minimal", payload: minimalPayload },
    { label: "required-only", payload: requiredPayload },
  ];

  if (Object.keys(sanitizeCrmProfileData(payload.profile.crmProfileData)).length > 0) {
    return [{ label: "rich", payload: richPayload }];
  }

  const seen = new Set<string>();
  return attempts.filter((attempt) => {
    const signature = JSON.stringify(attempt.payload);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

async function sendCreateClientRequest(
  createClientUrl: string,
  method: string,
  payload: unknown,
  auth: CrmAuth,
  redirectDepth = 0
): Promise<CreateClientRequestResult> {
  const requestHeaders = buildHeaders(auth);
  const response = await fetch(createClientUrl, {
    method,
    headers: requestHeaders,
    body: JSON.stringify(payload),
    redirect: "manual",
  });

  if (
    [301, 302, 303, 307, 308].includes(response.status) &&
    redirectDepth < 5
  ) {
    const location = response.headers.get("location");
    if (location) {
      const nextUrl = new URL(location, createClientUrl).toString();
      return sendCreateClientRequest(nextUrl, method, payload, auth, redirectDepth + 1);
    }
  }

  const responseBody = await readJsonOrText(response);
  return { response, responseBody, requestHeaders };
}

async function executeCreateWithFallbacks(
  createClientUrl: string,
  method: string,
  auth: CrmAuth,
  payloadAttempts: CreateClientPayloadAttempt[]
): Promise<CreateClientRequestResult & { usedAttemptLabel: string }> {
  const maxRetries = Math.max(1, parsePositiveInteger(process.env.CRM_CREATE_MAX_RETRIES) ?? 2);
  let lastResult: (CreateClientRequestResult & { usedAttemptLabel: string }) | null = null;

  for (const payloadAttempt of payloadAttempts) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await sendCreateClientRequest(createClientUrl, method, payloadAttempt.payload, auth);
      lastResult = { ...result, usedAttemptLabel: payloadAttempt.label };

      if (result.response.ok) {
        return lastResult;
      }

      if (!isRetryableCreateFailure(result.response.status, result.responseBody)) {
        break;
      }

      if (attempt < maxRetries) {
        const retryDelayMs = getRetryDelayMs(result.response, result.responseBody, attempt);
        console.warn("[crm-sync] retrying create request after transient failure.", {
          status: result.response.status,
          attempt,
          maxRetries,
          usedAttemptLabel: payloadAttempt.label,
          retryDelayMs,
        });
        await wait(retryDelayMs);
      }
    }
  }

  if (!lastResult) {
    throw new Error("CRM create request did not run any attempt.");
  }
  return lastResult;
}

function emptyPhase2EntitySummary(): Phase2EntitySummary {
  return { created: 0, updated: 0, deleted: 0, failed: 0 };
}

function pushPhase2Error(
  summary: Phase2EntitySummary,
  error: { operation: string; status?: number; response?: unknown; reason?: string }
): void {
  if (!summary.errors) summary.errors = [];
  if (summary.errors.length >= 5) return;
  summary.errors.push(error);
}

function emptyPhase2Summary(): Phase2SyncSummary {
  return {
    income: emptyPhase2EntitySummary(),
    expenses: emptyPhase2EntitySummary(),
    portfolio: emptyPhase2EntitySummary(),
    banking: emptyPhase2EntitySummary(),
  };
}

function normalizeKeyPart(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

function buildPhase2SyncKey(entityType: string, category: unknown, type: unknown, name: unknown): string {
  return [entityType, normalizeKeyPart(category), normalizeKeyPart(type), normalizeKeyPart(name)].join(":");
}

function rowMatchesClient(row: Record<string, unknown>, crmClientId: string): boolean {
  const rowClient = row.client;
  if (typeof rowClient === "number") return String(rowClient) === crmClientId;
  if (typeof rowClient === "string") return rowClient.trim() === crmClientId;
  return false;
}

function extractManagedSyncKey(row: Record<string, unknown>): string | undefined {
  const extraData = row.extra_data;
  if (!isRecord(extraData)) return undefined;
  if (extraData.sync_source !== CRM_PHASE2_SYNC_SOURCE) return undefined;
  const syncKey = extraData.sync_key;
  if (typeof syncKey !== "string") return undefined;
  const trimmed = syncKey.trim();
  return trimmed || undefined;
}

function getEnvMappedBudgetItem(envKey: string, category: string): string | undefined {
  const map = parseOptionalObject(process.env[envKey]);
  const normalizedCategory = normalizeText(category);
  for (const [key, rawValue] of Object.entries(map)) {
    if (normalizeText(key) !== normalizedCategory) continue;
    const mapped = cleanOptionalText(rawValue)?.toLowerCase();
    if (mapped) return mapped;
  }
  return undefined;
}

function mapIncomeBudgetItem(category: string): string {
  const fromEnv = getEnvMappedBudgetItem("CRM_INCOME_BUDGET_ITEM_MAP_JSON", category);
  if (fromEnv) return fromEnv;

  const normalized = normalizeText(category);
  if (normalized === "salary") return "salary";
  if (normalized === "rental income") return "rental_income";
  if (normalized === "dividends") return "local_dividends";
  if (normalized === "interest income") return "interest";
  if (normalized === "pension" || normalized === "retirement annuities") return "annuities";
  if (
    normalized === "business income" ||
    normalized === "sales of goods" ||
    normalized === "commission" ||
    normalized === "side hustle"
  ) {
    return "trade_income";
  }
  if (normalized === "board fees" || normalized === "bonus") return "fringe_benefits";
  return "other";
}

function mapExpenseBudgetItem(category: string): string {
  const fromEnv = getEnvMappedBudgetItem("CRM_EXPENSE_BUDGET_ITEM_MAP_JSON", category);
  if (fromEnv) return fromEnv;

  const normalized = normalizeText(category);
  if (normalized === "donations") return "donations";
  if (normalized === "tax") return "tax_paid";
  if (normalized === "retirement annuity") return "ra_contributions";
  if (normalized === "company pension") return "foreign_pensions";
  if (normalized === "investments") return "12j_contributions";
  if (normalized === "rental expenses") return "rental_income";
  return "other";
}

function buildPhase2ExtraData(payload: CrmSyncPayload, syncKey: string, entityType: string): Record<string, unknown> {
  return {
    sync_source: CRM_PHASE2_SYNC_SOURCE,
    sync_key: syncKey,
    sync_stage: payload.syncStage ?? "onboarding",
    external_user_id: payload.profile.id,
    entity_type: entityType,
  };
}

function getCrmProfileDataValue(payload: CrmSyncPayload, key: string): unknown {
  const data = payload.profile.crmProfileData;
  if (!data || typeof data !== "object") return undefined;
  return data[key];
}

function getBankingText(payload: CrmSyncPayload, profileKey: keyof CrmSyncPayload["profile"], crmFormKey: string): string | undefined {
  return cleanOptionalText(payload.profile[profileKey]) || cleanOptionalText(getCrmProfileDataValue(payload, crmFormKey));
}

function getBankingBankCode(payload: CrmSyncPayload): number | undefined {
  const fromProfile = parsePositiveInteger(payload.profile.bankCode);
  if (fromProfile !== undefined) return fromProfile;
  return parsePositiveInteger(getCrmProfileDataValue(payload, "clientbanking_set-0-bank"));
}

async function sendCrmRequestWithAuthFallback(
  url: string,
  method: string,
  auth: CrmAuth,
  body?: unknown
): Promise<CrmRequestResult> {
  const execute = async (candidateAuth: CrmAuth): Promise<CrmRequestResult> => {
    const requestHeaders = buildHeaders(candidateAuth);
    console.info("[crm-sync] sending CRM request", { url, method, auth_mode: candidateAuth.kind, body_snippet: body ? JSON.stringify(body).slice(0, 500) : null });
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const responseBody = await readJsonOrText(response);
    console.info("[crm-sync] CRM response", { url, status: response.status, auth_mode: candidateAuth.kind, response_snippet: typeof responseBody === "string" ? responseBody.slice(0, 500) : JSON.stringify(responseBody || {}).slice(0, 500) });
    return { response, responseBody, requestHeaders, authUsed: candidateAuth };
  };

  let result = await execute(auth);
  if ((result.response.status === 401 || result.response.status === 403) && auth.kind !== "token") {
    const tokenAuth = await tryResolveTokenAuth();
    if (tokenAuth && tokenAuth.kind === "token") {
      result = await execute(tokenAuth);
    }
  }

  if (result.response.status === 401 || result.response.status === 403) {
    // Return result but also log that auth may have failed for this URL
    console.warn("[crm-sync] CRM request returned 401/403", { url, method, auth_used: result.authUsed.kind, status: result.response.status });
  }

  return result;
}

async function fetchAllRowsForPhase2(
  listUrl: string,
  auth: CrmAuth,
  crmClientId: string
): Promise<{ rows: Record<string, unknown>[]; authUsed: CrmAuth }> {
  const pageSize = Math.max(20, parsePositiveInteger(process.env.CRM_PHASE2_PAGE_SIZE) ?? 200);
  const maxPages = Math.max(1, parsePositiveInteger(process.env.CRM_PHASE2_MAX_PAGES) ?? 20);
  const initialUrl = new URL(listUrl);
  initialUrl.searchParams.set("page_size", String(pageSize));
  initialUrl.searchParams.set("client", crmClientId);

  let activeAuth = auth;
  let nextUrl: string | undefined = initialUrl.toString();
  const visited = new Set<string>();
  const allRows: Record<string, unknown>[] = [];

  for (let page = 1; nextUrl && page <= maxPages; page++) {
    if (visited.has(nextUrl)) break;
    visited.add(nextUrl);

    const requestResult = await sendCrmRequestWithAuthFallback(nextUrl, "GET", activeAuth);
    activeAuth = requestResult.authUsed;
    if (!requestResult.response.ok) {
      throw new Error(
        `CRM phase-2 lookup failed (${new URL(nextUrl).pathname}) with HTTP ${requestResult.response.status}.`
      );
    }

    const { rows, nextUrl: discoveredNext } = extractRowsAndNextUrl(requestResult.responseBody, nextUrl);
    allRows.push(...rows);
    nextUrl = discoveredNext;
  }

  return { rows: allRows, authUsed: activeAuth };
}

async function syncPhase2Collection(
  listUrl: string | null,
  auth: CrmAuth,
  crmClientId: string,
  desired: Phase2DesiredRecord[]
): Promise<{ summary: Phase2EntitySummary; authUsed: CrmAuth }> {
  const summary = emptyPhase2EntitySummary();
  if (!listUrl) return { summary, authUsed: auth };

  const { rows, authUsed } = await fetchAllRowsForPhase2(listUrl, auth, crmClientId);
  let activeAuth = authUsed;
  const updateMethod = (process.env.CRM_PHASE2_UPDATE_METHOD || "PATCH").toUpperCase();

  const managedByKey = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!rowMatchesClient(row, crmClientId)) continue;
    const managedSyncKey = extractManagedSyncKey(row);
    if (!managedSyncKey) continue;
    if (!managedByKey.has(managedSyncKey)) {
      managedByKey.set(managedSyncKey, row);
    }
  }

  const desiredKeySet = new Set<string>();
  for (const desiredRecord of desired) {
    desiredKeySet.add(desiredRecord.syncKey);
    const existing = managedByKey.get(desiredRecord.syncKey);

    if (existing) {
      const existingId = extractRowId(existing);
      if (!existingId) {
        summary.failed += 1;
        pushPhase2Error(summary, {
          operation: "update",
          reason: "Existing row id missing.",
          response: existing,
        });
        continue;
      }
      const detailUrl = buildClientDetailUrl(listUrl, existingId);
      const requestResult = await sendCrmRequestWithAuthFallback(detailUrl, updateMethod, activeAuth, desiredRecord.payload);
      activeAuth = requestResult.authUsed;
      if (requestResult.response.ok) {
        summary.updated += 1;
      } else {
        summary.failed += 1;
        pushPhase2Error(summary, {
          operation: "update",
          status: requestResult.response.status,
          response: requestResult.responseBody,
        });
      }
      continue;
    }

    const requestResult = await sendCrmRequestWithAuthFallback(listUrl, "POST", activeAuth, desiredRecord.payload);
    activeAuth = requestResult.authUsed;
    if (requestResult.response.ok) {
      summary.created += 1;
    } else {
      summary.failed += 1;
      pushPhase2Error(summary, {
        operation: "create",
        status: requestResult.response.status,
        response: requestResult.responseBody,
      });
    }
  }

  for (const [syncKey, row] of managedByKey.entries()) {
    if (desiredKeySet.has(syncKey)) continue;
    const rowId = extractRowId(row);
    if (!rowId) {
      summary.failed += 1;
      pushPhase2Error(summary, {
        operation: "delete",
        reason: "Managed row id missing.",
        response: row,
      });
      continue;
    }
    const detailUrl = buildClientDetailUrl(listUrl, rowId);
    const deleteResult = await sendCrmRequestWithAuthFallback(detailUrl, "DELETE", activeAuth);
    activeAuth = deleteResult.authUsed;
    if (deleteResult.response.ok || deleteResult.response.status === 404) {
      summary.deleted += 1;
    } else {
      summary.failed += 1;
      pushPhase2Error(summary, {
        operation: "delete",
        status: deleteResult.response.status,
        response: deleteResult.responseBody,
      });
    }
  }

  return { summary, authUsed: activeAuth };
}

async function syncBankingCollection(
  listUrl: string | null,
  auth: CrmAuth,
  crmClientId: string,
  desired: Phase2DesiredRecord[]
): Promise<{ summary: Phase2EntitySummary; authUsed: CrmAuth }> {
  const summary = emptyPhase2EntitySummary();
  if (!listUrl || desired.length === 0) return { summary, authUsed: auth };

  const desiredRecord = desired[0];
  summary.payload = desiredRecord.payload;
  const { rows, authUsed } = await fetchAllRowsForPhase2(listUrl, auth, crmClientId);
  let activeAuth = authUsed;
  const updateMethod = (process.env.CRM_PHASE2_UPDATE_METHOD || "PATCH").toUpperCase();

  const managed = rows.find((row) => extractManagedSyncKey(row) === desiredRecord.syncKey);
  const existing = managed || rows.find((row) => rowMatchesClient(row, crmClientId));
  const existingId = existing ? extractRowId(existing) : undefined;

  const requestResult = existingId
    ? await sendCrmRequestWithAuthFallback(buildClientDetailUrl(listUrl, existingId), updateMethod, activeAuth, desiredRecord.payload)
    : await sendCrmRequestWithAuthFallback(listUrl, "POST", activeAuth, desiredRecord.payload);

  activeAuth = requestResult.authUsed;
  summary.response = requestResult.responseBody;
  console.info("[crm-sync] banking sync result", {
    operation: existingId ? "update" : "create",
    existingId: existingId ?? null,
    status: requestResult.response.status,
    payload: desiredRecord.payload,
    response_snippet: typeof requestResult.responseBody === "string" ? requestResult.responseBody.slice(0, 500) : JSON.stringify(requestResult.responseBody || {}).slice(0, 500),
  });
  if (requestResult.response.ok && !isPaginatedListResponse(requestResult.responseBody)) {
    if (existingId) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }
  } else {
    summary.failed += 1;
    pushPhase2Error(summary, {
      operation: existingId ? "update" : "create",
      status: requestResult.response.status,
      response: requestResult.responseBody,
      reason: isPaginatedListResponse(requestResult.responseBody)
        ? "CRM returned a list response instead of a banking row. Check collection URL trailing slash."
        : undefined,
    });
  }

  return { summary, authUsed: activeAuth };
}

async function runPhase2Sync(
  payload: CrmSyncPayload,
  auth: CrmAuth,
  crmClientId: string
): Promise<{ summary: Phase2SyncSummary; authUsed: CrmAuth }> {
  const summary = emptyPhase2Summary();
  const incomeLineUrl = ensureTrailingSlash(resolveUrl("CRM_CLIENT_INCOME_LINE_URL", "CRM_CLIENT_INCOME_LINE_PATH", "/wealth/clientincomeline/api/"));
  const expenseLineUrl = ensureTrailingSlash(resolveUrl("CRM_CLIENT_EXPENSE_LINE_URL", "CRM_CLIENT_EXPENSE_LINE_PATH", "/wealth/clientexpenseline/api/"));
  const portfolioLineUrl = ensureTrailingSlash(resolveUrl(
    "CRM_ASSET_LIABILITY_LINE_URL",
    "CRM_ASSET_LIABILITY_LINE_PATH",
    "/wealth/assetliabilityline/api/"
  ));
  const bankingUrl = ensureTrailingSlash(resolveUrl("CRM_CLIENT_BANKING_URL", "CRM_CLIENT_BANKING_PATH", "/wealth/clientbanking/api/"));

  const incomeDesired: Phase2DesiredRecord[] = payload.onboarding.income
    .filter((entry) => Number(entry.personal) > 0)
    .map((entry) => {
      const syncKey = buildPhase2SyncKey("income", entry.category, entry.type, entry.name);
      const monthlyAmount = Number(entry.personal) || 0;
      return {
        syncKey,
        payload: pruneUndefined({
          client: Number(crmClientId),
          description: cleanOptionalText(entry.name) || cleanOptionalText(entry.category),
          budget_item: mapIncomeBudgetItem(entry.category),
          monthly_amount: toDecimalString(monthlyAmount),
          annual_amount: toDecimalString(monthlyAmount * 12),
          tax: false,
          extra_data: buildPhase2ExtraData(payload, syncKey, "income"),
        }),
      };
    });

  const expenseDesired: Phase2DesiredRecord[] = payload.onboarding.expenses
    .filter((entry) => Number(entry.personal) > 0)
    .map((entry) => {
      const syncKey = buildPhase2SyncKey("expense", entry.category, entry.type, entry.name);
      const monthlyAmount = Number(entry.personal) || 0;
      return {
        syncKey,
        payload: pruneUndefined({
          client: Number(crmClientId),
          description: cleanOptionalText(entry.name) || cleanOptionalText(entry.category),
          budget_item: mapExpenseBudgetItem(entry.category),
          monthly_amount: toDecimalString(monthlyAmount),
          annual_amount: toDecimalString(monthlyAmount * 12),
          tax: false,
          subscription: false,
          extra_data: buildPhase2ExtraData(payload, syncKey, "expense"),
        }),
      };
    });

  const portfolioDesired: Phase2DesiredRecord[] = [
    ...payload.onboarding.assets
      .filter((entry) => Number(entry.personal) > 0)
      .map((entry) => {
        const syncKey = buildPhase2SyncKey("asset", entry.category, entry.type, entry.name);
        return {
          syncKey,
          payload: pruneUndefined({
            client: Number(crmClientId),
            description: cleanOptionalText(entry.name) || cleanOptionalText(entry.category),
            asset_value: toDecimalString(entry.personal),
            liability_value: "0.00",
            status: "active",
            show_on_client_portal: true,
            include_provider_notes: false,
            track_aum: false,
            track_commission: false,
            liquidate_on_death: false,
            liquidate_on_disability: false,
            liquidate_on_retirement: false,
            notes: `Imported asset from OneWayOut (${entry.category}).`,
            extra_data: buildPhase2ExtraData(payload, syncKey, "asset"),
          }),
        };
      }),
    ...payload.onboarding.liabilities
      .filter((entry) => Number(entry.personal) > 0)
      .map((entry) => {
        const syncKey = buildPhase2SyncKey("liability", entry.category, entry.type, entry.name);
        return {
          syncKey,
          payload: pruneUndefined({
            client: Number(crmClientId),
            description: cleanOptionalText(entry.name) || cleanOptionalText(entry.category),
            asset_value: "0.00",
            liability_value: toDecimalString(entry.personal),
            status: "active",
            show_on_client_portal: true,
            include_provider_notes: false,
            track_aum: false,
            track_commission: false,
            liquidate_on_death: false,
            liquidate_on_disability: false,
            liquidate_on_retirement: false,
            notes: `Imported liability from OneWayOut (${entry.category}).`,
            extra_data: buildPhase2ExtraData(payload, syncKey, "liability"),
          }),
        };
      }),
  ];

  const hasAnyBankingValue =
    getBankingText(payload, "bankAccountHolder", "clientbanking_set-0-account_holder") ||
    getBankingBankCode(payload) !== undefined ||
    getBankingText(payload, "bankName", "clientbanking_set-0-bank_name") ||
    getBankingText(payload, "bankBranchCode", "clientbanking_set-0-branch_code") ||
    getBankingText(payload, "bankAccountType", "clientbanking_set-0-account_type") ||
    getBankingText(payload, "bankAccountNumber", "clientbanking_set-0-account_number");

  const bankingDesired: Phase2DesiredRecord[] = hasAnyBankingValue
    ? [
        {
          syncKey: "banking:primary",
          payload: pruneUndefined({
            client: Number(crmClientId),
            account_holder: getBankingText(payload, "bankAccountHolder", "clientbanking_set-0-account_holder"),
            bank: getBankingBankCode(payload),
            bank_name: getBankingText(payload, "bankName", "clientbanking_set-0-bank_name"),
            branch_code: getBankingText(payload, "bankBranchCode", "clientbanking_set-0-branch_code"),
            account_type: getBankingText(payload, "bankAccountType", "clientbanking_set-0-account_type"),
            account_number: getBankingText(payload, "bankAccountNumber", "clientbanking_set-0-account_number"),
            extra_data: buildPhase2ExtraData(payload, "banking:primary", "banking"),
          }),
        },
      ]
    : [];

  let activeAuth = auth;
  const incomeResult = await syncPhase2Collection(incomeLineUrl, activeAuth, crmClientId, incomeDesired);
  summary.income = incomeResult.summary;
  activeAuth = incomeResult.authUsed;

  const expenseResult = await syncPhase2Collection(expenseLineUrl, activeAuth, crmClientId, expenseDesired);
  summary.expenses = expenseResult.summary;
  activeAuth = expenseResult.authUsed;

  const portfolioResult = await syncPhase2Collection(portfolioLineUrl, activeAuth, crmClientId, portfolioDesired);
  summary.portfolio = portfolioResult.summary;
  activeAuth = portfolioResult.authUsed;

  const bankingResult = await syncBankingCollection(bankingUrl, activeAuth, crmClientId, bankingDesired);
  summary.banking = bankingResult.summary;
  activeAuth = bankingResult.authUsed;

  return { summary, authUsed: activeAuth };
}

function appendPhase2Details(details: unknown, phase2Summary: Phase2SyncSummary): unknown {
  if (isRecord(details)) {
    return {
      ...details,
      phase2_sync: phase2Summary,
    };
  }
  return {
    client_response: details,
    phase2_sync: phase2Summary,
  };
}

async function buildSuccessResponseWithPhase2(params: {
  payload: CrmSyncPayload;
  auth: CrmAuth;
  message: string;
  crmClientId?: string;
  details?: unknown;
}): Promise<NextResponse<CrmSyncResponse>> {
  const { payload, auth, message, crmClientId, details } = params;
  const phase2Enabled = isEnabledByDefault(process.env.CRM_PHASE2_SYNC_ENABLED, true);
  const phase2Strict = isEnabledByDefault(process.env.CRM_PHASE2_STRICT, true);

  if (!phase2Enabled) {
    return NextResponse.json(
      {
        success: true,
        message,
        crmClientId,
        details,
      } satisfies CrmSyncResponse
    );
  }

  const numericClientId = crmClientId ? Number(crmClientId) : NaN;
  if (!Number.isInteger(numericClientId) || numericClientId <= 0) {
    if (phase2Strict) {
      throw new Error("CRM phase-2 sync requires a numeric crmClientId, but none was available from the create/update response.");
    }
    return NextResponse.json(
      {
        success: true,
        message,
        crmClientId,
        details: isRecord(details)
          ? {
              ...details,
              phase2_sync: { skipped: true, reason: "Missing numeric crmClientId." },
            }
          : details,
      } satisfies CrmSyncResponse
    );
  }

  try {
    const phase2Result = await runPhase2Sync(payload, auth, String(numericClientId));
    return NextResponse.json(
      {
        success: true,
        message,
        crmClientId: String(numericClientId),
        details: appendPhase2Details(details, phase2Result.summary),
      } satisfies CrmSyncResponse
    );
  } catch (error) {
    const phase2ErrorMessage = error instanceof Error ? error.message : "CRM phase-2 sync failed.";
    if (phase2Strict) {
      throw new Error(phase2ErrorMessage);
    }
    return NextResponse.json(
      {
        success: true,
        message,
        crmClientId: String(numericClientId),
        details: isRecord(details)
          ? {
              ...details,
              phase2_sync: { failed: true, error: phase2ErrorMessage },
            }
          : {
              client_response: details,
              phase2_sync: { failed: true, error: phase2ErrorMessage },
            },
      } satisfies CrmSyncResponse
    );
  }
}

export async function POST(request: Request) {
  const responseWhenDisabled: CrmSyncResponse = {
    success: false,
    skipped: true,
    message: "CRM sync is disabled. Set CRM_SYNC_ENABLED=true to enable it.",
  };
  if (!isEnabled(process.env.CRM_SYNC_ENABLED)) {
    console.error("[crm-sync] blocked: CRM_SYNC_ENABLED is not true.");
    return NextResponse.json(responseWhenDisabled, { status: 503 });
  }

  const createClientUrl = resolveUrl(
    "CRM_CREATE_CLIENT_URL",
    "CRM_CREATE_CLIENT_PATH",
    "/wealth/individualclient/api/"
  );
  if (!createClientUrl) {
    console.error("[crm-sync] blocked: CRM create endpoint is missing from env.");
    return NextResponse.json(
      {
        success: false,
        message: "CRM create endpoint missing. Set CRM_CREATE_CLIENT_URL or CRM_BASE_URL + CRM_CREATE_CLIENT_PATH.",
      } satisfies CrmSyncResponse,
      { status: 500 }
    );
  }

  let payload: CrmSyncPayload;
  try {
    payload = (await request.json()) as CrmSyncPayload;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON payload received for CRM sync." } satisfies CrmSyncResponse,
      { status: 400 }
    );
  }

  // Allow clients to omit `onboarding` and treat it as empty data.
  if (!payload.onboarding || typeof payload.onboarding !== "object") {
    payload.onboarding = { income: [], expenses: [], assets: [], liabilities: [] };
  }

  if (!payload?.profile?.id || !payload?.profile?.email) {
    return NextResponse.json(
      {
        success: false,
        message: "CRM sync requires profile.id and profile.email.",
      } satisfies CrmSyncResponse,
      { status: 400 }
    );
  }

  const profileId = String(payload.profile.id).trim();
  const syncIdentityKey = `${profileId}::${normalizeText(payload.profile.email)}`;
  if (inFlightSyncKeys.has(syncIdentityKey)) {
    return NextResponse.json(
      {
        success: true,
        skipped: true,
        message: "CRM sync already in progress for this user. Duplicate request ignored.",
      } satisfies CrmSyncResponse
    );
  }

  inFlightSyncKeys.add(syncIdentityKey);
  try {
    const auth = await resolveAuth();

    const organisationId = await resolveOrganisationId(auth);
    const titleId = await resolveTitleId(auth);
    const clientTypeId = await resolveClientTypeId(auth);

    const defaultFields = parseOptionalObject(process.env.CRM_DEFAULT_FIELDS_JSON);
    const wrapperKey = process.env.CRM_PAYLOAD_WRAPPER_KEY?.trim();
    const payloadAttempts = buildCreatePayloadAttempts(payload, organisationId, titleId, clientTypeId, defaultFields).map((entry) => ({
      ...entry,
      payload: wrapperKey ? { [wrapperKey]: entry.payload } : entry.payload,
    }));

    const existingClientId = await findExistingClientIdByEmail(
      createClientUrl,
      payload.profile.email,
      payload.profile.id,
      auth
    );
    if (existingClientId) {
      const updateUrl = buildClientDetailUrl(createClientUrl, existingClientId);
      const updateMethod = (process.env.CRM_UPDATE_CLIENT_METHOD || "PATCH").toUpperCase();
      let activeAuth = auth;
      let { response, responseBody, requestHeaders, usedAttemptLabel } = await executeCreateWithFallbacks(
        updateUrl,
        updateMethod,
        activeAuth,
        payloadAttempts
      );

      if ((response.status === 401 || response.status === 403) && auth.kind !== "token") {
        const tokenAuth = await tryResolveTokenAuth();
        if (tokenAuth && tokenAuth.kind === "token") {
          activeAuth = tokenAuth;
          const retried = await executeCreateWithFallbacks(updateUrl, updateMethod, tokenAuth, payloadAttempts);
          response = retried.response;
          responseBody = retried.responseBody;
          requestHeaders = retried.requestHeaders;
          usedAttemptLabel = retried.usedAttemptLabel;
        }
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return NextResponse.json(
            {
              success: false,
              message: "CRM auth failed on update client request.",
              details: {
                status: response.status,
                auth_mode: activeAuth.kind,
                auth_header_name: Object.keys(requestHeaders).find((k) => k.toLowerCase() === "authorization") || null,
                payload_mode: usedAttemptLabel,
                body: responseBody,
              },
            } satisfies CrmSyncResponse,
            { status: 502 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            message: `CRM update client call failed (HTTP ${response.status}).`,
            details: {
              crmClientId: existingClientId,
              payload_mode: usedAttemptLabel,
              response: responseBody,
            },
          } satisfies CrmSyncResponse,
          { status: 502 }
        );
      }

      return buildSuccessResponseWithPhase2({
        payload,
        auth: activeAuth,
        message: "Client updated in CRM successfully.",
        crmClientId: existingClientId,
        details: responseBody,
      });
    }

    const method = (process.env.CRM_CREATE_CLIENT_METHOD || "POST").toUpperCase();
    let activeAuth = auth;
    let { response, responseBody, requestHeaders, usedAttemptLabel } = await executeCreateWithFallbacks(
      createClientUrl,
      method,
      activeAuth,
      payloadAttempts
    );

    if ((response.status === 401 || response.status === 403) && auth.kind !== "token") {
      const tokenAuth = await tryResolveTokenAuth();
      if (tokenAuth && tokenAuth.kind === "token") {
        activeAuth = tokenAuth;
        const retried = await executeCreateWithFallbacks(createClientUrl, method, tokenAuth, payloadAttempts);
        response = retried.response;
        responseBody = retried.responseBody;
        requestHeaders = retried.requestHeaders;
        usedAttemptLabel = retried.usedAttemptLabel;
      }
    }

    if (!response.ok) {
      console.error("[crm-sync] create client request failed.", {
        status: response.status,
        statusText: response.statusText,
        usedAttemptLabel,
        body: responseBody,
      });

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            success: false,
            message: "CRM auth failed on create client request.",
            details: {
              status: response.status,
              auth_mode: activeAuth.kind,
              auth_header_name: Object.keys(requestHeaders).find((k) => k.toLowerCase() === "authorization") || null,
              payload_mode: usedAttemptLabel,
              body: responseBody,
            },
          } satisfies CrmSyncResponse,
          { status: 502 }
        );
      }

      if (isDuplicateClientResponse(responseBody)) {
        const existingId =
          extractClientId(responseBody) ||
          (await findExistingClientIdByEmail(createClientUrl, payload.profile.email, payload.profile.id, activeAuth));

        if (existingId) {
          const updateUrl = buildClientDetailUrl(createClientUrl, existingId);
          const updateMethod = (process.env.CRM_UPDATE_CLIENT_METHOD || "PATCH").toUpperCase();
          const updateResult = await executeCreateWithFallbacks(updateUrl, updateMethod, activeAuth, payloadAttempts);
          if (updateResult.response.ok) {
            return buildSuccessResponseWithPhase2({
              payload,
              auth: activeAuth,
              message: "Client already existed in CRM and was updated successfully.",
              crmClientId: existingId,
              details: updateResult.responseBody,
            });
          }
        }

        return buildSuccessResponseWithPhase2({
          payload,
          auth: activeAuth,
          message: "Client already exists in CRM.",
          crmClientId: existingId,
          details: responseBody,
        });
      }

      if (isRetryableCreateFailure(response.status, responseBody)) {
        const eventuallyFoundId = await findExistingClientIdByEmail(
          createClientUrl,
          payload.profile.email,
          payload.profile.id,
          activeAuth
        );
        if (eventuallyFoundId) {
          return buildSuccessResponseWithPhase2({
            payload,
            auth: activeAuth,
            message: "Client created in CRM (verified after retryable response).",
            crmClientId: eventuallyFoundId,
            details: responseBody,
          });
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: `CRM create client call failed (HTTP ${response.status}).`,
          details: {
            payload_mode: usedAttemptLabel,
            response: responseBody,
          },
        } satisfies CrmSyncResponse,
        { status: 502 }
      );
    }

    return buildSuccessResponseWithPhase2({
      payload,
      auth: activeAuth,
      message: "Client synced to CRM successfully.",
      crmClientId: extractClientId(responseBody),
      details: responseBody,
    });
  } catch (error) {
    if (error instanceof CrmError) {
      const snippet =
        typeof error.responseBody === "string"
          ? error.responseBody.slice(0, 2000)
          : (error.responseBody ? JSON.stringify(error.responseBody).slice(0, 2000) : null);

      const details = {
        crm: {
          url: error.url,
          status: error.status,
          response: snippet,
          auth_mode: error.authUsed || null,
        },
      };

      console.error("[crm-sync] CRM error during sync.", details);
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          details,
        } satisfies CrmSyncResponse,
        { status: 502 }
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected CRM sync error.";
    console.error("[crm-sync] unexpected error.", { message });
    return NextResponse.json(
      {
        success: false,
        message,
      } satisfies CrmSyncResponse,
      { status: 500 }
    );
  } finally {
    inFlightSyncKeys.delete(syncIdentityKey);
  }
}
