"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  isPastSlot,
  isValidAvailabilityDate,
  normalizeAvailabilityTime,
  parseAvailabilityList,
  type ParsedAvailabilitySlot,
} from "@/lib/coachAvailability";

const CALENDAR_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortParsedSlots(slots: ParsedAvailabilitySlot[]): ParsedAvailabilitySlot[] {
  const weekdayOrder: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return [...slots].sort((a, b) => {
    if (a.kind === "date" && b.kind === "date") {
      const dateDiff = a.date.localeCompare(b.date);
      return dateDiff !== 0 ? dateDiff : a.time.localeCompare(b.time);
    }
    if (a.kind === "weekly" && b.kind === "weekly") {
      const dayDiff = (weekdayOrder[a.weekday] ?? 99) - (weekdayOrder[b.weekday] ?? 99);
      return dayDiff !== 0 ? dayDiff : a.time.localeCompare(b.time);
    }
    return a.kind === "date" ? -1 : 1;
  });
}

function serializeSlots(slots: ParsedAvailabilitySlot[]): string {
  return sortParsedSlots(slots)
    .map((slot) => slot.raw)
    .join(", ");
}

function formatSlotLabel(slot: ParsedAvailabilitySlot): string {
  if (slot.kind === "date") {
    return `${format(parseISO(slot.date), "EEE, MMM d, yyyy")} · ${slot.time}`;
  }
  return `Every ${slot.weekday} · ${slot.time}`;
}

type AvailabilitySlotBuilderProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function AvailabilitySlotBuilder({
  value,
  onChange,
  className,
}: AvailabilitySlotBuilderProps) {
  const slots = useMemo(() => parseAvailabilityList(value), [value]);

  const datesWithSlots = useMemo(() => {
    const dates = new Set<string>();
    slots.forEach((slot) => {
      if (slot.kind === "date") dates.add(slot.date);
    });
    return dates;
  }, [slots]);

  const todayIso = useMemo(() => toISODate(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedTime, setSelectedTime] = useState("09:00");

  const monthLabel = visibleMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const selectedDaySlots = useMemo(
    () =>
      slots.filter(
        (slot) => slot.kind === "date" && slot.date === selectedDate
      ),
    [selectedDate, slots]
  );

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayWeekIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{
      isoDate: string;
      dayNumber: number;
      isToday: boolean;
      hasSlots: boolean;
      slotCount: number;
    }> = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const isoDate = toISODate(new Date(year, month, day));
      const slotCount = slots.filter(
        (slot) => slot.kind === "date" && slot.date === isoDate
      ).length;
      cells.push({
        isoDate,
        dayNumber: day,
        isToday: isoDate === todayIso,
        hasSlots: datesWithSlots.has(isoDate),
        slotCount,
      });
    }

    return { firstDayWeekIndex, cells };
  }, [datesWithSlots, slots, todayIso, visibleMonth]);

  const goToPreviousMonth = () => {
    setVisibleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayIso);
  };

  const normalizedSelectedTime = normalizeAvailabilityTime(selectedTime);
  const canAddSlot =
    isValidAvailabilityDate(selectedDate) &&
    normalizedSelectedTime !== null &&
    !isPastSlot(selectedDate, normalizedSelectedTime);

  const addSlot = () => {
    if (!canAddSlot || !normalizedSelectedTime) return;
    const nextRaw = `${selectedDate} ${normalizedSelectedTime}`;
    if (slots.some((slot) => slot.raw === nextRaw)) return;
    onChange(serializeSlots([...slots, { kind: "date", raw: nextRaw, date: selectedDate, time: normalizedSelectedTime }]));
  };

  const removeSlot = (raw: string) => {
    onChange(serializeSlots(slots.filter((item) => item.raw !== raw)));
  };

  const inputClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  return (
    <div className={className}>
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={goToToday}
              className="mt-0.5 text-xs text-teal-600 hover:underline dark:text-teal-400"
            >
              Today
            </button>
          </div>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
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
            <div key={`pad-${idx}`} className="h-10" aria-hidden />
          ))}
          {calendarDays.cells.map((day) => {
            const isSelected = day.isoDate === selectedDate;
            const tone = day.hasSlots
              ? "border-teal-200 bg-teal-50/90 text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
              : "border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300";
            const selectedRing = isSelected
              ? " ring-2 ring-teal-600 ring-offset-2 dark:ring-offset-gray-900"
              : "";
            const todayRing =
              day.isToday && !isSelected
                ? " ring-1 ring-teal-400/80 ring-offset-1 dark:ring-offset-gray-900"
                : "";

            return (
              <button
                key={day.isoDate}
                type="button"
                onClick={() => setSelectedDate(day.isoDate)}
                className={`relative flex h-10 w-full flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${tone}${selectedRing}${todayRing}`}
              >
                {day.dayNumber}
                {day.hasSlots ? (
                  <span className="absolute bottom-0.5 text-[9px] font-semibold leading-none text-teal-600 dark:text-teal-300">
                    {day.slotCount > 1 ? day.slotCount : "•"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
        Selected:{" "}
        <span className="font-medium">
          {format(parseISO(selectedDate), "EEE, MMM d, yyyy")} · one-off slot
        </span>
      </p>

      {selectedDaySlots.length > 0 ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {selectedDaySlots.length} slot
          {selectedDaySlots.length === 1 ? "" : "s"} on this date:{" "}
          {selectedDaySlots.map((slot) => slot.time).join(", ")}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={addSlot}
          disabled={!canAddSlot}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add slot
        </button>
      </div>

      {!canAddSlot && normalizedSelectedTime ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Choose a future date and time for new availability.
        </p>
      ) : null}

      {slots.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {sortParsedSlots(slots).map((slot) => (
            <li
              key={slot.raw}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
            >
              <span>{formatSlotLabel(slot)}</span>
              <button
                type="button"
                onClick={() => removeSlot(slot.raw)}
                aria-label={`Remove ${slot.raw}`}
                className="rounded-full p-0.5 hover:bg-teal-100 dark:hover:bg-teal-800/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          No availability yet. Choose a date on the calendar, pick a time, then
          add a one-off slot.
        </p>
      )}
    </div>
  );
}
