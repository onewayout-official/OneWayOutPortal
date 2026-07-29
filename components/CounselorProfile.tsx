"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, MapPin, Star, Languages } from "lucide-react";
import CounselorBookingCalendar from "@/components/CounselorBookingCalendar";
import { Counselor, CounselorAppointment, resolveCounselorImage } from "@/lib/counselors";
import type { AvailabilitySlot } from "@/lib/coachAvailability";
import { parseAvailabilityList } from "@/lib/coachAvailability";
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
  if (status === "busy") return "Calendar busy";
  if (status === "past") return "Past";
  if (status === "outside_hours") return "Not scheduled";
  return "Book session";
}

function slotStatusBadgeClass(status: AvailabilitySlot["status"]): string {
  if (status === "available") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  if (status === "booked") {
    return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }
  if (status === "busy") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200";
  }
  return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
}

export default function CounselorProfile({ counselor }: { counselor: Counselor }) {
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
  const [graphSyncStatus, setGraphSyncStatus] = useState<
    "live" | "network" | "not_configured" | "no_mailbox" | "error"
  >("error");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const monthRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return {
      from: toISODate(new Date(year, month, 1)),
      to: toISODate(new Date(year, month + 1, 0)),
    };
  }, []);

  const fetchRange = useMemo(() => {
    const today = toISODate(new Date());
    const horizon = toISODate(new Date(Date.now() + 42 * 24 * 60 * 60 * 1000));
    // Do not start before today (avoids 60+ day Graph windows when viewing the current month).
    const from = monthRange.from < today ? today : monthRange.from;
    const to = monthRange.to > horizon ? monthRange.to : horizon;
    return from <= to ? { from, to } : { from: today, to: today };
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
        graphSyncStatus?: "live" | "network" | "not_configured" | "no_mailbox" | "error";
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load availability.");
      }

      setAvailabilitySlots(json.slots ?? []);
      setGraphSynced(Boolean(json.graphSynced));
      setGraphSyncStatus(json.graphSyncStatus ?? (json.graphSynced ? "live" : "error"));
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

  const handleSelectDate = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
    setSelectedTime("");
    setBookingError(null);
  }, []);

  const handleSelectTime = useCallback((time: string) => {
    setSelectedTime(time);
    setBookingError(null);
  }, []);

  const weeklySlots = useMemo(
    () =>
      parseAvailabilityList(counselor.availability)
        .map((slot) => {
          if (slot.kind === "date") {
            const status =
              slotByKey.get(slotKey(slot.date, slot.time))?.status ?? "outside_hours";
            return {
              key: slot.raw,
              dayLabel: slot.date,
              time: slot.time,
              endTime: addMinutes(slot.time, 20),
              nextDate: slot.date,
              status,
            };
          }

          const weekday = WEEKDAY_TO_INDEX[slot.weekday];
          if (weekday === undefined) return null;
          const nextDate = toISODate(getNextDateForWeekday(weekday));
          const status =
            slotByKey.get(slotKey(nextDate, slot.time))?.status ?? "outside_hours";
          return {
            key: slot.raw,
            dayLabel: slot.weekday,
            time: slot.time,
            endTime: addMinutes(slot.time, 20),
            nextDate,
            status,
          };
        })
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot)),
    [counselor.availability, slotByKey]
  );

  const todayIso = toISODate(new Date());
  const todaySlots = weeklySlots.filter((slot) => slot.nextDate === todayIso);

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
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Today</h3>
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
                      onClick={() => openBookingConfirm(slot.nextDate, slot.time)}
                      className={`mt-2 w-full rounded-md px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                        slot.status === "available"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : slotStatusBadgeClass(slot.status)
                      }`}
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
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Scheduled</h3>
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
                      handleSelectDate(slot.nextDate);
                      handleSelectTime(slot.time);
                      openBookingConfirm(slot.nextDate, slot.time);
                    }}
                    className={`mt-2 w-full rounded-md px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                      slot.status === "available"
                        ? "border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
                        : slotStatusBadgeClass(slot.status)
                    }`}
                  >
                    {slotStatusLabel(slot.status)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <CounselorBookingCalendar
            availabilitySlots={availabilitySlots}
            isLoading={isLoadingAvailability}
            graphSynced={graphSynced}
            graphSyncStatus={graphSyncStatus}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={handleSelectDate}
            onSelectTime={handleSelectTime}
            onReviewBooking={() => openBookingConfirm(selectedDate, selectedTime)}
            canReview={Boolean(selectedSlotAvailable)}
            isBooking={isBooking}
            bookingError={bookingError}
          />
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
