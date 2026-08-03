const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** Microsoft Graph getSchedule FreeBusy window limit (days, inclusive). */
export const GRAPH_MAX_SCHEDULE_DAYS = 62;

export type BusyInterval = {
  start: Date;
  end: Date;
};

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

const scheduleCache = new Map<string, { expiresAt: number; intervals: BusyInterval[] }>();

/** Avoid re-PATCHing the same mailbox display name on every send. */
const mailboxDisplayNameEnsured = new Set<string>();

const MICROSOFT_FETCH_TIMEOUT_MS = 30_000;

async function fetchMicrosoft(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(MICROSOFT_FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      lastError = err;
      const code = (err as { code?: string }).code;
      const retryable =
        code === "UND_ERR_CONNECT_TIMEOUT" ||
        (err instanceof Error && /timeout|fetch failed/i.test(err.message));
      if (!retryable || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  throw lastError;
}

export function isNetworkGraphError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  return (
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    /fetch failed|timeout|ECONNRESET|ENOTFOUND/i.test(error.message)
  );
}

export function isMicrosoftGraphConfigured(): boolean {
  const tenantId = process.env.AZURE_TENANT_ID?.trim() ?? "";
  const clientId = process.env.AZURE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim() ?? "";
  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return Boolean(
    guidPattern.test(tenantId) &&
      guidPattern.test(clientId) &&
      clientSecret.length > 0 &&
      clientSecret !== "..." &&
      !clientSecret.startsWith("your-")
  );
}

export function getMeetingTimezone(): string {
  return process.env.TEAMS_MEETING_TIMEZONE ?? "Africa/Johannesburg";
}

export function getMeetingDurationMinutes(): number {
  const value = Number(process.env.TEAMS_MEETING_DURATION_MINUTES ?? "20");
  return Number.isFinite(value) && value > 0 ? value : 20;
}

function getAvailabilityCacheTtlMs(): number {
  const seconds = Number(process.env.AVAILABILITY_CACHE_TTL_SECONDS ?? "300");
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1000;
}

export async function getGraphAccessToken(): Promise<string | null> {
  if (!isMicrosoftGraphConfigured()) {
    return null;
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const tenantId = process.env.AZURE_TENANT_ID!.trim();
  const response = await fetchMicrosoft(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!.trim(),
        client_secret: process.env.AZURE_CLIENT_SECRET!.trim(),
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    const description = json.error_description ?? "Failed to authenticate with Microsoft Graph.";
    if (description.includes("AADSTS900023")) {
      throw new Error(
        "Invalid AZURE_TENANT_ID. Use the Directory (tenant) ID GUID from Azure Portal → App registrations → Overview."
      );
    }
    throw new Error(description);
  }

  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };

  return json.access_token;
}

function ymdFromDateTime(dateTime: string): string {
  return dateTime.slice(0, 10);
}

function addCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inclusiveDaySpan(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  const start = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((end - start) / 86_400_000) + 1;
}

/** Graph getSchedule rejects windows longer than 62 days. */
export function clampScheduleDateTimeRange(
  startDateTime: string,
  endDateTime: string
): { startDateTime: string; endDateTime: string } {
  const fromYmd = ymdFromDateTime(startDateTime);
  const toYmd = ymdFromDateTime(endDateTime);
  if (inclusiveDaySpan(fromYmd, toYmd) <= GRAPH_MAX_SCHEDULE_DAYS) {
    return { startDateTime, endDateTime };
  }
  const clampedToYmd = addCalendarDays(fromYmd, GRAPH_MAX_SCHEDULE_DAYS - 1);
  const timePart = endDateTime.includes("T") ? endDateTime.slice(endDateTime.indexOf("T")) : "T23:59:59";
  return {
    startDateTime,
    endDateTime: `${clampedToYmd}${timePart}`,
  };
}

function parseGraphDateTime(dateTime: string, timeZone: string): Date {
  if (dateTime.endsWith("Z") || /[+-]\d\d:\d\d$/.test(dateTime)) {
    return new Date(dateTime);
  }
  return new Date(`${dateTime} (${timeZone})`);
}

export async function getCoachBusyIntervals(
  coachEmail: string,
  startDateTime: string,
  endDateTime: string,
  timeZone = getMeetingTimezone()
): Promise<BusyInterval[]> {
  const cacheKey = `${coachEmail}|${startDateTime}|${endDateTime}|${timeZone}`;
  const cached = scheduleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.intervals;
  }

  const token = await getGraphAccessToken();
  if (!token) {
    return [];
  }

  const { startDateTime: scheduleStart, endDateTime: scheduleEnd } =
    clampScheduleDateTimeRange(startDateTime, endDateTime);

  const response = await fetchMicrosoft(
    `${GRAPH_BASE}/users/${encodeURIComponent(coachEmail)}/calendar/getSchedule`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: `outlook.timezone="${timeZone}"`,
      },
      body: JSON.stringify({
        schedules: [coachEmail],
        startTime: { dateTime: scheduleStart, timeZone },
        endTime: { dateTime: scheduleEnd, timeZone },
        availabilityViewInterval: getMeetingDurationMinutes(),
      }),
    }
  );

  const json = (await response.json()) as {
    value?: Array<{
      scheduleItems?: Array<{
        status?: string;
        start?: { dateTime?: string; timeZone?: string };
        end?: { dateTime?: string; timeZone?: string };
      }>;
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Failed to load Outlook schedule.");
  }

  const intervals: BusyInterval[] = [];
  for (const schedule of json.value ?? []) {
    for (const item of schedule.scheduleItems ?? []) {
      if (item.status === "free") continue;
      const startRaw = item.start?.dateTime;
      const endRaw = item.end?.dateTime;
      if (!startRaw || !endRaw) continue;
      intervals.push({
        start: parseGraphDateTime(startRaw, item.start?.timeZone ?? timeZone),
        end: parseGraphDateTime(endRaw, item.end?.timeZone ?? timeZone),
      });
    }
  }

  scheduleCache.set(cacheKey, {
    expiresAt: Date.now() + getAvailabilityCacheTtlMs(),
    intervals,
  });

  return intervals;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hourText, minuteText] = time.split(":");
  const totalMinutes = Number(hourText) * 60 + Number(minuteText) + minutesToAdd;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export async function createCoachTeamsMeeting({
  coachEmail,
  appointmentDate,
  appointmentTime,
  coachName,
  userName,
  userEmail,
}: {
  coachEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  coachName: string;
  userName: string;
  userEmail?: string | null;
}): Promise<{ meetingLink: string; eventId: string } | null> {
  const token = await getGraphAccessToken();
  if (!token) {
    return null;
  }

  const timeZone = getMeetingTimezone();
  const duration = getMeetingDurationMinutes();
  const endTime = addMinutesToTime(appointmentTime, duration);

  const attendees = userEmail?.trim()
    ? [
        {
          emailAddress: { address: userEmail.trim(), name: userName },
          type: "required",
        },
      ]
    : [];

  const response = await fetchMicrosoft(
    `${GRAPH_BASE}/users/${encodeURIComponent(coachEmail)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: `OneWayOut coaching session with ${userName}`,
        body: {
          contentType: "HTML",
          content: `<p>20-minute life coach/counsellor session booked via the OneWayOut portal.</p><p>Coach: ${coachName}</p>`,
        },
        start: { dateTime: `${appointmentDate}T${appointmentTime}:00`, timeZone },
        end: { dateTime: `${appointmentDate}T${endTime}:00`, timeZone },
        attendees,
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      }),
    }
  );

  const json = (await response.json()) as {
    id?: string;
    onlineMeeting?: { joinUrl?: string };
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Failed to create Teams meeting.");
  }

  const meetingLink = json.onlineMeeting?.joinUrl ?? "";
  if (!json.id || !meetingLink) {
    throw new Error("Teams meeting was created without a join link.");
  }

  return { meetingLink, eventId: json.id };
}

export async function deleteCoachTeamsMeeting(
  coachEmail: string,
  eventId: string
): Promise<boolean> {
  const token = await getGraphAccessToken();
  if (!token || !eventId.trim()) {
    return false;
  }

  const response = await fetchMicrosoft(
    `${GRAPH_BASE}/users/${encodeURIComponent(coachEmail)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.ok || response.status === 404;
}

export async function sendGraphEmail({
  senderMailbox,
  to,
  subject,
  html,
  replyTo,
  fromDisplayName,
}: {
  senderMailbox: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
  /** Shown as the From display name (e.g. "OneWayOut" instead of mailbox name "No Reply"). */
  fromDisplayName?: string | null;
}): Promise<void> {
  const token = await getGraphAccessToken();
  if (!token) {
    throw new Error("Microsoft Graph is not configured.");
  }

  const displayName = fromDisplayName?.trim() || null;

  // Exchange often ignores message.from.name and uses the mailbox Display Name.
  // Best-effort: align the mailbox display name in Entra ID / Exchange.
  if (displayName) {
    await ensureMailboxDisplayName(senderMailbox, displayName, token);
  }

  const message: Record<string, unknown> = {
    subject,
    body: {
      contentType: "HTML",
      content: html,
    },
    toRecipients: [{ emailAddress: { address: to } }],
  };

  if (displayName) {
    message.from = {
      emailAddress: {
        address: senderMailbox,
        name: displayName,
      },
    };
    // Some clients read sender() when from is rewritten by Exchange.
    message.sender = {
      emailAddress: {
        address: senderMailbox,
        name: displayName,
      },
    };
  }

  if (replyTo?.trim()) {
    message.replyTo = [{ emailAddress: { address: replyTo.trim() } }];
  }

  const response = await fetchMicrosoft(
    `${GRAPH_BASE}/users/${encodeURIComponent(senderMailbox)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; code?: string };
    };
    const detail = json.error?.message ?? "Graph sendMail failed.";
    if (detail.toLowerCase().includes("access is denied")) {
      throw new Error(
        `${detail} Add Mail.Send application permission in Azure and grant admin consent.`
      );
    }
    throw new Error(detail);
  }
}

/**
 * Sets the Azure AD / mailbox display name so Graph sendMail shows the right From name.
 * Requires User.ReadWrite.All (or equivalent). Failures are logged and ignored.
 */
async function ensureMailboxDisplayName(
  mailbox: string,
  displayName: string,
  token: string
): Promise<void> {
  const cacheKey = `${mailbox.toLowerCase()}::${displayName}`;
  if (mailboxDisplayNameEnsured.has(cacheKey)) return;

  try {
    const getResponse = await fetchMicrosoft(
      `${GRAPH_BASE}/users/${encodeURIComponent(mailbox)}?$select=displayName,mail,userPrincipalName`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (getResponse.ok) {
      const user = (await getResponse.json()) as { displayName?: string };
      if (user.displayName?.trim() === displayName) {
        mailboxDisplayNameEnsured.add(cacheKey);
        return;
      }
    }

    const patchResponse = await fetchMicrosoft(
      `${GRAPH_BASE}/users/${encodeURIComponent(mailbox)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      }
    );

    if (patchResponse.ok || patchResponse.status === 204) {
      mailboxDisplayNameEnsured.add(cacheKey);
      return;
    }

    const json = (await patchResponse.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    console.warn(
      `[graph] Could not set mailbox display name for ${mailbox} to "${displayName}": ${
        json.error?.message ?? patchResponse.status
      }. Rename the mailbox Display name to "${displayName}" in Microsoft 365 admin (Users / Shared mailboxes), or grant the app User.ReadWrite.All.`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[graph] ensureMailboxDisplayName failed for ${mailbox}:`, msg);
  }
}
