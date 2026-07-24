"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock3,
  MapPin,
  Star,
  Languages,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Counselor, CounselorAppointment, resolveCounselorImage } from "@/lib/counselors";
import type { AvailabilitySlot } from "@/lib/coachAvailability";
import { getAuthHeader } from "@/lib/authHeader";
import { rewards } from "@/lib/gamification/rewards";
import { notifyRewardPointsUpdated } from "@/lib/gamification/rewardPoints";
import { storage } from "@/lib/storage";

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

const slotKey = (date: string, time: string) => `${date}|${time}`;

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

function slotStatusLabel(status: AvailabilitySlot["status"]) {
  if (status === "booked") return "Booked";
  if (status === "busy") return "Unavailable";
  if (status === "past") return "Past";
  return "Book 20 min session";
}

export default function CounselorProfile({ counselor }: { counselor: Counselor }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [pendingBooking, setPendingBooking] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [bookingPopup, setBookingPopup] = useState<{
    date: string;
    time: string;
    meetingLink: string;
  } | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [graphSynced, setGraphSynced] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const monthRange = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    return {
      from: toISODate(new Date(year, month, 1)),
      to: toISODate(new Date(year, month + 1, 0)),
    };
  }, [visibleMonth]);

  const fetchRange = useMemo(() => {
    const today = toISODate(new Date());
    const horizon = toISODate(new Date(Date.now() + 42 * 24 * 60 * 60 * 1000));
    const from = monthRange.from < today ? monthRange.from : today;
    const to = monthRange.to > horizon ? monthRange.to : horizon;
    return { from, to };
  }, [monthRange.from, monthRange.to]);

  const slotByKey = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    availabilitySlots.forEach((slot) => map.set(slot.key, slot));
    return map;
  }, [availabilitySlots]);

  const loadAvailability = useCallback(async () => {
    setIsLoadingAvailability(true);
    try {
      const headers = await getAuthHeader();
      const params = new URLSearchParams({
        from: fetchRange.from,
        to: fetchRange.to,
      });
      const response = await fetch(
        `/api/counselors/${counselor.id}/availability?${params.toString()}`,
        { method: "GET", headers }
      );
      const json = (await response.json()) as {
        slots?: AvailabilitySlot[];
        graphSynced?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load availability.");
      }

      setAvailabilitySlots(json.slots ?? []);
      setGraphSynced(Boolean(json.graphSynced));
      setBookingError(null);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to load availability.");
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [counselor.id, fetchRange.from, fetchRange.to]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

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
      const hasAvailability = availabilitySlots.some(
        (slot) => slot.date === isoDate && slot.status === "available"
      );
      cells.push({ isoDate, dayNumber: day, hasAvailability });
    }

    return { firstDayWeekIndex, cells };
  }, [availabilitySlots, visibleMonth]);

  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return [];
    return availabilitySlots
      .filter((slot) => slot.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [availabilitySlots, selectedDate]);

  const weeklySlots = useMemo(
    () =>
      counselor.availability
        .map((slot) => {
          const [dayLabel, time] = slot.split(" ");
          const weekday = WEEKDAY_TO_INDEX[dayLabel];
          if (weekday === undefined || !time) return null;
          const nextDate = toISODate(getNextDateForWeekday(weekday));
          const status = slotByKey.get(slotKey(nextDate, time))?.status ?? "outside_hours";
          return {
            key: slot,
            dayLabel,
            time,
            endTime: addMinutes(time, 20),
            nextDate,
            status,
          };
        })
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot)),
    [counselor.availability, slotByKey]
  );

  const todayDayLabel = WEEKDAY_LABELS[new Date().getDay()];
  const todaySlots = weeklySlots.filter((slot) => slot.dayLabel === todayDayLabel);

  const openBookingConfirm = (date: string, time: string) => {
    setBookingError(null);
    setBookingPopup(null);
    setSelectedDate(date);
    setSelectedTime(time);

    const status = slotByKey.get(slotKey(date, time))?.status;
    if (status !== "available") {
      setBookingError(
        status === "booked"
          ? "This slot is already booked. Please choose another time."
          : status === "busy"
            ? "This slot is unavailable on the coach's Outlook calendar."
            : "Choose a future available appointment slot."
      );
      return;
    }

    setPendingBooking({ date, time });
  };

  const confirmBooking = async () => {
    if (!pendingBooking) return;

    setBookingError(null);
    setIsBooking(true);

    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/counselor-appointments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          counselorId: counselor.id,
          appointmentDate: pendingBooking.date,
          appointmentTime: pendingBooking.time,
        }),
      });

      const json = (await response.json()) as {
        appointment?: CounselorAppointment;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to book appointment.");
      }

      await loadAvailability();
      setBookingPopup({
        date: pendingBooking.date,
        time: pendingBooking.time,
        meetingLink: json.appointment?.meetingLink ?? "",
      });
      setPendingBooking(null);

      try {
        await rewards.awardTask("book-life-counseling");
        await storage.logEarnActivity();
        notifyRewardPointsUpdated();
      } catch {
        // Booking succeeded; a points hiccup shouldn't surface as a booking error.
      }
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book appointment.");
    } finally {
      setIsBooking(false);
    }
  };

  const selectedSlotAvailable =
    selectedDate &&
    selectedTime &&
    slotByKey.get(slotKey(selectedDate, selectedTime))?.status === "available";

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveCounselorImage(counselor.image)}
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
                      disabled={slot.status !== "available" || isLoadingAvailability}
                      onClick={() => {
                        const date = new Date(`${slot.nextDate}T00:00:00`);
                        setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                        openBookingConfirm(slot.nextDate, slot.time);
                      }}
                      className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {slotStatusLabel(slot.status)}
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
                    disabled={slot.status !== "available" || isLoadingAvailability}
                    onClick={() => {
                      const date = new Date(`${slot.nextDate}T00:00:00`);
                      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      openBookingConfirm(slot.nextDate, slot.time);
                    }}
                    className="mt-2 w-full rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    {slotStatusLabel(slot.status)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Book Appointment</h2>

          {!graphSynced && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200">
              Live Outlook calendar sync is unavailable. Slots are based on portal bookings and coach working hours only.
            </p>
          )}

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
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
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
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  className="rounded-md border border-gray-200 p-1 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Available
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Booked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Outlook busy
              </span>
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
              {isLoadingAvailability && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Loading live availability...
                </p>
              )}
              {selectedDateSlots.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDateSlots.map((slot) => {
                    const isDisabled = slot.status !== "available";
                    const suffix =
                      slot.status === "booked"
                        ? " booked"
                        : slot.status === "busy"
                          ? " busy"
                          : slot.status === "past"
                            ? " past"
                            : "";
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          isDisabled
                            ? slot.status === "busy"
                              ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                              : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                            : selectedTime === slot.time
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {slot.time}
                        {suffix}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Select an available date to view time slots.
                </p>
              )}

              <button
                type="button"
                disabled={!selectedSlotAvailable || isBooking || isLoadingAvailability}
                onClick={() => openBookingConfirm(selectedDate, selectedTime)}
                className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Review selected 20 min session
              </button>
              {bookingError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{bookingError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {pendingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm session</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Book a 20-minute session with {counselor.name} on {pendingBooking.date} at{" "}
              {pendingBooking.time}?
            </p>
            {bookingError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                {bookingError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isBooking}
                onClick={() => setPendingBooking(null)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBooking}
                onClick={confirmBooking}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBooking ? "Booking..." : "Confirm booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session booked</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Your 20-minute session with {counselor.name} is confirmed for {bookingPopup.date} at{" "}
              {bookingPopup.time}.
            </p>
            {bookingPopup.meetingLink ? (
              <a
                href={bookingPopup.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
              >
                Join Teams meeting
              </a>
            ) : (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                <p className="font-medium">Teams link pending</p>
                <p className="mt-1">
                  Your meeting link will appear here once Microsoft Teams is configured for this coach.
                </p>
              </div>
            )}
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
