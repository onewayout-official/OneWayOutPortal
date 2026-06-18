"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock3,
  MapPin,
  Star,
  Languages,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Counselor } from "@/lib/counselors";
import { getAuthHeader } from "@/lib/authHeader";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CALENDAR_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMinutes = (time: string, minutesToAdd: number) => {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const total = hour * 60 + minute + minutesToAdd;
  const endHour = Math.floor((total % (24 * 60)) / 60);
  const endMinute = total % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
};

const getNextDateForWeekday = (weekday: number) => {
  const now = new Date();
  const result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = (weekday - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + delta);
  return result;
};

export default function CounselorProfile({ counselor }: { counselor: Counselor }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingPopup, setBookingPopup] = useState<{
    date: string;
    time: string;
    link: string;
  } | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const availabilityByWeekday = useMemo(() => {
    const map = new Map<number, string[]>();
    counselor.availability.forEach((slot) => {
      const [dayLabel, time] = slot.split(" ");
      const weekday = WEEKDAY_TO_INDEX[dayLabel];
      if (weekday === undefined || !time) {
        return;
      }
      const existing = map.get(weekday) ?? [];
      map.set(weekday, [...existing, time]);
    });
    return map;
  }, [counselor.availability]);

  const monthDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayWeekIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{
      isoDate: string;
      dayNumber: number;
      hasAvailability: boolean;
    }> = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const isoDate = toISODate(date);
      const hasAvailability = (availabilityByWeekday.get(date.getDay()) ?? []).length > 0;
      cells.push({ isoDate, dayNumber: day, hasAvailability });
    }

    return { firstDayWeekIndex, cells };
  }, [availabilityByWeekday, visibleMonth]);

  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    const selected = new Date(`${selectedDate}T00:00:00`);
    return availabilityByWeekday.get(selected.getDay()) ?? [];
  }, [availabilityByWeekday, selectedDate]);

  const weeklySlots = useMemo(
    () =>
      counselor.availability
        .map((slot) => {
          const [dayLabel, time] = slot.split(" ");
          const weekday = WEEKDAY_TO_INDEX[dayLabel];
          if (weekday === undefined || !time) {
            return null;
          }
          const nextDate = getNextDateForWeekday(weekday);
          return {
            key: slot,
            dayLabel,
            time,
            endTime: addMinutes(time, 20),
            nextDate: toISODate(nextDate),
          };
        })
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot)),
    [counselor.availability],
  );

  const todayDayLabel = WEEKDAY_LABELS[new Date().getDay()];
  const todaySlots = weeklySlots.filter((slot) => slot.dayLabel === todayDayLabel);

  const openBookingPopup = async (date: string, time: string) => {
    const meetingId = `${counselor.id}-${date}-${time}`.replace(/[^a-zA-Z0-9]/g, "");
    const teamsLink = `https://teams.microsoft.com/l/meetup-join/${meetingId}`;
    setBookingError(null);
    setIsBooking(true);

    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/counselor-appointments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          counselorId: counselor.id,
          appointmentDate: date,
          appointmentTime: time,
          meetingLink: teamsLink,
        }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to book appointment.");
      }

      setBookingPopup({ date, time, link: teamsLink });
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book appointment.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/help-me"
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to counselors
      </Link>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            src={counselor.image}
            alt={counselor.name}
            className="h-20 w-20 rounded-full object-cover"
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{counselor.name}</h1>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{counselor.title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{counselor.about}</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-700">
                <Star className="h-3.5 w-3.5" /> {counselor.rating}/5
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-700">
                <MapPin className="h-3.5 w-3.5" /> {counselor.location}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-700">
                <Languages className="h-3.5 w-3.5" /> {counselor.languages.join(", ")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-700">
                {counselor.sessionsCompleted}+ sessions
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Availability</h2>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Today ({todayDayLabel})</h3>
            <div className="mt-2 space-y-2">
              {todaySlots.length > 0 ? (
                todaySlots.map((slot) => (
                  <div
                    key={`today-${slot.key}`}
                    className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <Clock3 className="h-4 w-4" />
                      {slot.time} - {slot.endTime}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(slot.nextDate);
                        setSelectedTime(slot.time);
                        const date = new Date(`${slot.nextDate}T00:00:00`);
                        setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                        openBookingPopup(slot.nextDate, slot.time);
                      }}
                      className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Book 20 min session
                    </button>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  No slots available today.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Weekly</h3>
            <div className="mt-2 space-y-2">
              {weeklySlots.map((slot) => (
                <div
                  key={`weekly-${slot.key}`}
                  className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <Clock3 className="h-4 w-4" />
                    {slot.dayLabel} {slot.time} - {slot.endTime}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(slot.nextDate);
                      setSelectedTime(slot.time);
                      const date = new Date(`${slot.nextDate}T00:00:00`);
                      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      openBookingPopup(slot.nextDate, slot.time);
                    }}
                    className="mt-2 w-full rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    Book 20 min session
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Book Appointment</h2>

          <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {visibleMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </p>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() =>
                    setVisibleMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                    )
                  }
                  className="rounded-md border border-gray-200 p-1 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() =>
                    setVisibleMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                    )
                  }
                  className="rounded-md border border-gray-200 p-1 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400">
              {CALENDAR_WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: monthDays.firstDayWeekIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-9" />
              ))}
              {monthDays.cells.map((day) => (
                <button
                  key={day.isoDate}
                  type="button"
                  disabled={!day.hasAvailability}
                  onClick={() => {
                    setSelectedDate(day.isoDate);
                    setSelectedTime("");
                  }}
                  className={`h-9 rounded-md text-sm transition-colors ${
                    day.hasAvailability
                      ? "border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
                      : "border border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-600"
                  } ${
                    selectedDate === day.isoDate
                      ? "bg-blue-100 dark:bg-blue-900/40"
                      : "bg-transparent"
                  }`}
                >
                  {day.dayNumber}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Available time slots</p>
              {selectedDateSlots.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDateSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        selectedTime === slot
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Select an available date to view time slots.
                </p>
              )}

              <button
                type="button"
                disabled={!selectedDate || !selectedTime || isBooking}
                onClick={() => openBookingPopup(selectedDate, selectedTime)}
                className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBooking ? "Booking..." : "Book selected 20 min session"}
              </button>
              {bookingError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{bookingError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {bookingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session booked</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Your 20-minute session with {counselor.name} is confirmed for {bookingPopup.date} at{" "}
              {bookingPopup.time}.
            </p>
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              <p className="font-medium">MS Teams link</p>
              <a
                href={bookingPopup.link}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all underline"
              >
                {bookingPopup.link}
              </a>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBookingPopup(null)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
