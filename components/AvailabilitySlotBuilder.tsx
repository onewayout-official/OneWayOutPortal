"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Weekday = (typeof WEEKDAYS)[number];

function parseSlots(value: string): string[] {
  const seen = new Set<string>();
  const slots: string[] = [];

  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [dayRaw, timeRaw] = part.split(/\s+/);
      if (!dayRaw || !timeRaw) return;

      const day =
        dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1, 3).toLowerCase();
      const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})$/);
      if (!WEEKDAYS.includes(day as Weekday) || !timeMatch) return;

      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      if (hours > 23 || minutes > 59) return;

      const normalized = `${day} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      slots.push(normalized);
    });

  return slots;
}

function sortSlots(slots: string[]): string[] {
  const dayOrder = Object.fromEntries(WEEKDAYS.map((day, index) => [day, index]));

  return [...slots].sort((a, b) => {
    const [dayA, timeA] = a.split(" ");
    const [dayB, timeB] = b.split(" ");
    const dayDiff = (dayOrder[dayA] ?? 99) - (dayOrder[dayB] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return timeA.localeCompare(timeB);
  });
}

function serializeSlots(slots: string[]): string {
  return sortSlots(slots).join(", ");
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
  const slots = useMemo(() => parseSlots(value), [value]);
  const [selectedDay, setSelectedDay] = useState<Weekday>("Mon");
  const [selectedTime, setSelectedTime] = useState("09:00");

  const addSlot = () => {
    if (!selectedTime) return;
    const next = `${selectedDay} ${selectedTime}`;
    if (slots.includes(next)) return;
    onChange(serializeSlots([...slots, next]));
  };

  const removeSlot = (slot: string) => {
    onChange(serializeSlots(slots.filter((item) => item !== slot)));
  };

  const inputClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-teal-600 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

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
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Add slot
        </button>
      </div>

      {slots.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => (
            <li
              key={slot}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
            >
              <span>{slot}</span>
              <button
                type="button"
                onClick={() => removeSlot(slot)}
                aria-label={`Remove ${slot}`}
                className="rounded-full p-0.5 hover:bg-teal-100 dark:hover:bg-teal-800/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          No availability slots yet. Pick a day and time, then add a slot.
        </p>
      )}
    </div>
  );
}
