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

  availability.forEach((slot) => {
    const [dayLabel, time] = slot.trim().split(" ");
    const weekday = WEEKDAY_TO_INDEX[dayLabel];
    if (weekday === undefined || !time) return;
    const existing = availabilityByWeekday.get(weekday) ?? [];
    availabilityByWeekday.set(weekday, [...existing, time]);
  });

  const start = parseISODate(from);
  const end = parseISODate(to);
  const candidates: Array<{ date: string; time: string }> = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const isoDate = formatISODate(cursor);
    const times = availabilityByWeekday.get(cursor.getDay()) ?? [];
    for (const time of times) {
      candidates.push({ date: isoDate, time });
    }
  }

  return candidates;
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
