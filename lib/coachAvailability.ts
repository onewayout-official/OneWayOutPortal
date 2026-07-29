import type { BusyInterval } from "@/lib/microsoftGraph";
import { getMeetingDurationMinutes } from "@/lib/microsoftGraph";

export type AvailabilitySlotStatus =
  | "available"
  | "booked"
  | "busy"
  | "past"
  | "outside_hours";

export type AvailabilitySlot = {
  date: string;
  time: string;
  status: AvailabilitySlotStatus;
  key: string;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export type ParsedAvailabilitySlot =
  | { kind: "date"; raw: string; date: string; time: string }
  | { kind: "weekly"; raw: string; weekday: string; time: string };

export function slotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

export function isValidAvailabilityDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function isPastSlot(date: string, time: string, now = new Date()): boolean {
  return new Date(`${date}T${time}:00`).getTime() < now.getTime();
}

export function normalizeAvailabilityTime(time: string): string | null {
  const match = time.trim().match(TIME_PATTERN);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseAvailabilitySlot(raw: string): ParsedAvailabilitySlot | null {
  const trimmed = raw.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return null;

  const first = trimmed.slice(0, spaceIndex);
  const time = normalizeAvailabilityTime(trimmed.slice(spaceIndex + 1));
  if (!time) return null;

  if (isValidAvailabilityDate(first)) {
    return { kind: "date", raw: `${first} ${time}`, date: first, time };
  }

  const weekday =
    first.charAt(0).toUpperCase() + first.slice(1, 3).toLowerCase();
  if (WEEKDAY_TO_INDEX[weekday] === undefined) return null;

  return { kind: "weekly", raw: `${weekday} ${time}`, weekday, time };
}

export function parseAvailabilityList(
  value: string | string[]
): ParsedAvailabilitySlot[] {
  const parts = Array.isArray(value)
    ? value
    : value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

  const seen = new Set<string>();
  const parsed: ParsedAvailabilitySlot[] = [];

  for (const part of parts) {
    const slot = parseAvailabilitySlot(part);
    if (!slot || seen.has(slot.raw)) continue;
    seen.add(slot.raw);
    parsed.push(slot);
  }

  return parsed;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hourText, minuteText] = time.split(":");
  const totalMinutes = Number(hourText) * 60 + Number(minuteText) + minutesToAdd;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseISODate(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expandWorkingHours(availability: string[], from: string, to: string) {
  const availabilityByWeekday = new Map<number, string[]>();
  const dateSpecific: Array<{ date: string; time: string }> = [];

  parseAvailabilityList(availability).forEach((slot) => {
    if (slot.kind === "date") {
      if (slot.date >= from && slot.date <= to) {
        dateSpecific.push({ date: slot.date, time: slot.time });
      }
      return;
    }

    const weekday = WEEKDAY_TO_INDEX[slot.weekday];
    if (weekday === undefined) return;
    const existing = availabilityByWeekday.get(weekday) ?? [];
    availabilityByWeekday.set(weekday, [...existing, slot.time]);
  });

  const start = parseISODate(from);
  const end = parseISODate(to);
  const candidates: Array<{ date: string; time: string }> = [...dateSpecific];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const isoDate = formatISODate(cursor);
    const times = availabilityByWeekday.get(cursor.getDay()) ?? [];
    for (const time of times) {
      candidates.push({ date: isoDate, time });
    }
  }

  const seen = new Set<string>();
  return candidates.filter(({ date, time }) => {
    const key = slotKey(date, time);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slotInterval(date: string, time: string, durationMinutes: number) {
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(`${date}T${addMinutesToTime(time, durationMinutes)}:00`);
  return { start, end };
}

function overlapsBusy(
  date: string,
  time: string,
  durationMinutes: number,
  busyIntervals: BusyInterval[]
): boolean {
  const slot = slotInterval(date, time, durationMinutes);
  return busyIntervals.some(
    (busy) => slot.start < busy.end && slot.end > busy.start
  );
}

export function computeCoachAvailability({
  availability,
  from,
  to,
  bookedSlots,
  busyIntervals,
  sessionDurationMinutes = getMeetingDurationMinutes(),
  now = new Date(),
}: {
  availability: string[];
  from: string;
  to: string;
  bookedSlots: Array<{ date: string; time: string }>;
  busyIntervals: BusyInterval[];
  sessionDurationMinutes?: number;
  now?: Date;
}): AvailabilitySlot[] {
  const bookedKeys = new Set(bookedSlots.map((slot) => slotKey(slot.date, slot.time)));
  const candidates = expandWorkingHours(availability, from, to);

  return candidates.map(({ date, time }) => {
    const key = slotKey(date, time);
    let status: AvailabilitySlotStatus = "available";

    if (isPastSlot(date, time, now)) {
      status = "past";
    } else if (bookedKeys.has(key)) {
      status = "booked";
    } else if (overlapsBusy(date, time, sessionDurationMinutes, busyIntervals)) {
      status = "busy";
    }

    return { date, time, status, key };
  });
}

export function isSlotAvailable(
  slots: AvailabilitySlot[],
  date: string,
  time: string
): boolean {
  const key = slotKey(date, time);
  return slots.some((slot) => slot.key === key && slot.status === "available");
}

export function getWeekdayLabel(date: string): string {
  return WEEKDAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
}
