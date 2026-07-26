"use client";

import { useEffect, useMemo, useRef } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import type { AvailabilitySlot } from "@/lib/coachAvailability";

const CALENDAR_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type DayBookingSummary =
  | "empty"
  | "past"
  | "available"
  | "full"
  | "unavailable";

export function summarizeDaySlots(
  isoDate: string,
  slots: AvailabilitySlot[],
  todayIso: string
): {
  summary: DayBookingSummary;
  available: number;
  booked: number;
  busy: number;
  total: number;
} {
  const daySlots = slots.filter((s) => s.date === isoDate);
  const total = daySlots.length;
  if (total === 0) {
    return { summary: "empty", available: 0, booked: 0, busy: 0, total: 0 };
  }
  const available = daySlots.filter((s) => s.status === "available").length;
  const booked = daySlots.filter((s) => s.status === "booked").length;
  const busy = daySlots.filter((s) => s.status === "busy").length;

  if (isoDate < todayIso) {
    return { summary: "past", available, booked, busy, total };
  }
  if (available > 0) {
    return { summary: "available", available, booked, busy, total };
  }
  if (booked > 0 || busy > 0) {
    return { summary: "full", available, booked, busy, total };
  }
  return { summary: "unavailable", available, booked, busy, total };
}

function formatTime12h(time: string): string {
  const [hText, mText] = time.split(":");
  let h = Number(hText);
  const m = mText ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function slotPillClass(status: AvailabilitySlot["status"], selected: boolean): string {
  if (status === "available") {
    return selected
      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (status === "booked") {
    return "cursor-default border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
  if (status === "busy") {
    return "cursor-default border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200";
  }
  return "cursor-default border-gray-200 bg-gray-50 text-gray-400 line-through dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500";
}

function dayCellClass(
  summary: DayBookingSummary,
  isSelected: boolean,
  isToday: boolean
): string {
  const base =
    "relative flex h-11 w-full flex-col items-center justify-center rounded-lg text-sm font-medium transition-all";

  if (summary === "empty") {
    return `${base} cursor-default text-gray-300 dark:text-gray-600`;
  }
  if (summary === "past") {
    return `${base} cursor-default border border-transparent text-gray-400 dark:text-gray-600`;
  }

  let tone = "border border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400";
  if (summary === "available") {
    tone =
      "border border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50";
  } else if (summary === "full") {
    tone =
      "border border-rose-200 bg-rose-50/60 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200";
  }

  const selected = isSelected ? " ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : "";
  const today =
    isToday && !isSelected
      ? " ring-1 ring-blue-400/70 ring-offset-1 dark:ring-offset-gray-900"
      : "";

  return `${base} ${tone}${selected}${today}`;
}

type GraphSyncStatus = "live" | "network" | "not_configured" | "no_mailbox" | "error";

function graphSyncBanner(status: GraphSyncStatus): string | null {
  switch (status) {
    case "live":
      return null;
    case "network":
      return "Could not reach Microsoft from this server (timeout or firewall). Slots use portal bookings and coach hours only—try again or test on production.";
    case "not_configured":
      return "Azure calendar is not configured. Set AZURE_* and GRAPH_MAIL_SENDER in the environment.";
    case "no_mailbox":
      return "This coach has no linked Microsoft mailbox. Link a login email in Admin → Coaches.";
    case "error":
      return "Outlook calendar sync failed. Check Azure Calendars.ReadWrite permission and that the coach email exists in Microsoft 365.";
    default:
      return "Outlook calendar sync is off. Booked portal slots still show; coach calendar conflicts may not.";
  }
}

type Props = {
  availabilitySlots: AvailabilitySlot[];
  isLoading: boolean;
  graphSynced: boolean;
  graphSyncStatus?: GraphSyncStatus;
  selectedDate: string;
  selectedTime: string;
  onSelectDate: (isoDate: string) => void;
  onSelectTime: (time: string) => void;
  onReviewBooking: () => void;
  canReview: boolean;
  isBooking: boolean;
  bookingError: string | null;
};

export default function CounselorBookingCalendar({
  availabilitySlots,
  isLoading,
  graphSynced,
  graphSyncStatus = graphSynced ? "live" : "error",
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onReviewBooking,
  canReview,
  isBooking,
  bookingError,
}: Props) {
  const todayIso = useMemo(() => toISODate(new Date()), []);
  const visibleMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const monthLabel = visibleMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayWeekIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{
      isoDate: string;
      dayNumber: number;
      summary: DayBookingSummary;
      available: number;
      isToday: boolean;
      clickable: boolean;
    }> = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const isoDate = toISODate(new Date(year, month, day));
      const { summary, available } = summarizeDaySlots(isoDate, availabilitySlots, todayIso);
      const clickable = summary === "available" || summary === "full";
      cells.push({
        isoDate,
        dayNumber: day,
        summary,
        available,
        isToday: isoDate === todayIso,
        clickable,
      });
    }

    return { firstDayWeekIndex, cells };
  }, [availabilitySlots, todayIso, visibleMonth]);

  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    return availabilitySlots
      .filter((slot) => slot.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [availabilitySlots, selectedDate]);

  const selectedDayMeta = useMemo(() => {
    if (!selectedDate) return null;
    return summarizeDaySlots(selectedDate, availabilitySlots, todayIso);
  }, [availabilitySlots, selectedDate, todayIso]);

  const availableSlots = selectedDateSlots.filter((s) => s.status === "available");
  const takenSlots = selectedDateSlots.filter(
    (s) => s.status === "booked" || s.status === "busy"
  );

  const didAutoSelectDate = useRef(false);

  useEffect(() => {
    if (didAutoSelectDate.current || selectedDate || isLoading || availabilitySlots.length === 0) {
      return;
    }
    const firstBookable = calendarDays.cells.find(
      (c) => c.summary === "available" || c.summary === "full"
    );
    if (firstBookable) {
      didAutoSelectDate.current = true;
      onSelectDate(firstBookable.isoDate);
    }
  }, [
    availabilitySlots.length,
    calendarDays.cells,
    isLoading,
    onSelectDate,
    selectedDate,
  ]);

  const syncNotice = graphSyncBanner(graphSyncStatus);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Book a session</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              20-minute slots · {monthLabel}
            </p>
          </div>
        </div>
        {isLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </span>
        )}
      </div>

      {!graphSynced && syncNotice && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-100">
          {syncNotice}
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
        <p className="text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
          {monthLabel}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Open
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Fully booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Portal booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Calendar busy
          </span>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {CALENDAR_WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: calendarDays.firstDayWeekIndex }).map((_, idx) => (
            <div key={`pad-${idx}`} className="h-11" aria-hidden />
          ))}
          {calendarDays.cells.map((day) => {
            const dot =
              day.summary === "available" ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
              ) : day.summary === "full" ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-400" />
              ) : null;

            return (
              <button
                key={day.isoDate}
                type="button"
                disabled={!day.clickable || isLoading}
                title={
                  day.summary === "available"
                    ? `${day.available} open slot(s)`
                    : day.summary === "full"
                      ? "No open slots"
                      : undefined
                }
                onClick={() => {
                  onSelectDate(day.isoDate);
                  onSelectTime("");
                }}
                className={dayCellClass(
                  day.summary,
                  selectedDate === day.isoDate,
                  day.isToday
                )}
              >
                {day.dayNumber}
                {dot}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
        {!selectedDate ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pick a highlighted date to see times.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {selectedDayMeta && selectedDayMeta.summary === "available" && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {selectedDayMeta.available} open
                </span>
              )}
              {selectedDayMeta && selectedDayMeta.summary === "full" && (
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                  Fully booked
                </span>
              )}
            </div>

            {availableSlots.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  Available
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => onSelectTime(slot.time)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${slotPillClass(
                        slot.status,
                        selectedTime === slot.time
                      )}`}
                    >
                      {formatTime12h(slot.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {takenSlots.length > 0 && (
              <div className={availableSlots.length > 0 ? "mt-4" : "mt-2"}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Not available
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {takenSlots.map((slot) => (
                    <span
                      key={slot.time}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${slotPillClass(
                        slot.status,
                        false
                      )}`}
                    >
                      {formatTime12h(slot.time)}
                      {slot.status === "booked" ? " · Booked" : " · Busy"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedDateSlots.length === 0 && !isLoading && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                No sessions on this day.
              </p>
            )}
          </>
        )}

        <button
          type="button"
          disabled={!canReview || isBooking || isLoading}
          onClick={onReviewBooking}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBooking ? "Booking…" : "Continue to confirm"}
        </button>
        {bookingError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {bookingError}
          </p>
        )}
      </div>
    </div>
  );
}
