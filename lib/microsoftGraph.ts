const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

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
  const response = await fetch(
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

  const response = await fetch(
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
        startTime: { dateTime: startDateTime, timeZone },
        endTime: { dateTime: endDateTime, timeZone },
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

  const response = await fetch(
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

  const response = await fetch(
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
}: {
  senderMailbox: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
}): Promise<void> {
  const token = await getGraphAccessToken();
  if (!token) {
    throw new Error("Microsoft Graph is not configured.");
  }

  const message: Record<string, unknown> = {
    subject,
    body: {
      contentType: "HTML",
      content: html,
    },
    toRecipients: [{ emailAddress: { address: to } }],
  };

  if (replyTo?.trim()) {
    message.replyTo = [{ emailAddress: { address: replyTo.trim() } }];
  }

  const response = await fetch(
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
