import { Asset, Income, Liability, RegistrationExpense, UserProfile } from "@/types";

export type CrmProfilePayload = Pick<
  UserProfile,
  | "id"
  | "name"
  | "initials"
  | "email"
  | "phone"
  | "workNumber"
  | "homeNumber"
  | "workEmail"
  | "monthlyIncome"
  | "savingsGoal"
  | "capital"
  | "debts"
  | "lastIncome"
  | "lastExpenses"
  | "createdAt"
  | "dateOfBirth"
  | "dateOfMarriage"
  | "idNumber"
  | "taxNumber"
  | "occupation"
  | "employer"
  | "highestQualification"
  | "gender"
  | "maritalStatus"
  | "sourceOfWealth"
  | "industryClassification"
  | "bankAccountHolder"
  | "bankCode"
  | "bankName"
  | "bankBranchCode"
  | "bankAccountType"
  | "bankAccountNumber"
  | "crmProfileData"
>;

export type CrmIncomePayload = Pick<Income, "category" | "type" | "name" | "personal" | "points">;
export type CrmExpensePayload = Pick<RegistrationExpense, "category" | "type" | "name" | "personal" | "points">;
export type CrmAssetPayload = Pick<Asset, "category" | "type" | "name" | "personal" | "points" | "interestRate">;
export type CrmLiabilityPayload = Pick<Liability, "category" | "type" | "name" | "personal" | "points" | "interestRate">;

export interface CrmSyncPayload {
  syncStage?: "signup" | "onboarding";
  profile: CrmProfilePayload;
  onboarding: {
    income: CrmIncomePayload[];
    expenses: CrmExpensePayload[];
    assets: CrmAssetPayload[];
    liabilities: CrmLiabilityPayload[];
  };
}

export interface CrmSyncResponse {
  success: boolean;
  skipped?: boolean;
  message?: string;
  crmClientId?: string;
  details?: unknown;
}

interface RecentSyncEntry {
  timestamp: number;
  response: CrmSyncResponse;
}

const inFlightSyncRequests = new Map<string, Promise<CrmSyncResponse>>();
const recentSuccessfulSyncs = new Map<string, RecentSyncEntry>();
const RECENT_SYNC_TTL_MS = 2 * 60 * 1000;

function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
  return cleaned as T;
}

function getSyncRequestKey(payload: CrmSyncPayload): string {
  const stage = payload.syncStage || "onboarding";
  const email = payload.profile.email?.trim().toLowerCase() || "";
  return `${stage}:${payload.profile.id}:${email}`;
}

export async function syncClientToCrm(
  payload: CrmSyncPayload,
  options?: { force?: boolean; profileOnly?: boolean }
): Promise<CrmSyncResponse> {
  const force = options?.force === true;
  const profileOnly = options?.profileOnly === true;
  const requestKey = getSyncRequestKey(payload);
  if (!force) {
    const recentlySynced = recentSuccessfulSyncs.get(requestKey);
    if (recentlySynced && Date.now() - recentlySynced.timestamp < RECENT_SYNC_TTL_MS) {
      return recentlySynced.response;
    }
  }

  const existingRequest = inFlightSyncRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const runRequest = (async (): Promise<CrmSyncResponse> => {
  try {
    const bodyPayload = profileOnly
      ? pruneUndefined({ syncStage: payload.syncStage || undefined, profile: payload.profile })
      : payload;

    const response = await fetch("/api/crm/sync-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    let data: CrmSyncResponse | null = null;
    try {
      data = (await response.json()) as CrmSyncResponse;
    } catch {
      data = null;
    }

    if (!response.ok) {
      return {
        success: false,
        message: data?.message ?? `CRM sync failed (HTTP ${response.status}).`,
        details: data?.details,
      };
    }

    if (data && typeof data.success === "boolean") {
      if (data.success) {
        recentSuccessfulSyncs.set(requestKey, { timestamp: Date.now(), response: data });
      }
      return data;
    }

    const fallback = { success: true, message: "CRM sync completed." };
    recentSuccessfulSyncs.set(requestKey, { timestamp: Date.now(), response: fallback });
    return fallback;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error while syncing CRM.";
    return { success: false, message };
  }
  })();

  inFlightSyncRequests.set(requestKey, runRequest);
  try {
    return await runRequest;
  } finally {
    inFlightSyncRequests.delete(requestKey);
  }
}
