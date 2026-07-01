"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Clock3, MapPin, Video, XCircle } from "lucide-react";
import { CounselorAppointment, resolveCounselorImage } from "@/lib/counselors";
import { getAuthHeader } from "@/lib/authHeader";

function formatAppointmentDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isUpcoming(appointment: CounselorAppointment) {
  if (appointment.status !== "scheduled") {
    return false;
  }

  return new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`).getTime() >= Date.now();
}

export default function MyCoachSessions() {
  const [appointments, setAppointments] = useState<CounselorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/counselor-appointments", { method: "GET", headers });
      const json = (await response.json()) as {
        appointments?: CounselorAppointment[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load sessions.");
      }

      setAppointments(json.appointments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const upcomingAppointments = useMemo(
    () => appointments.filter(isUpcoming),
    [appointments],
  );
  const pastAppointments = useMemo(
    () => appointments.filter((appointment) => !isUpcoming(appointment)),
    [appointments],
  );

  const cancelAppointment = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/counselor-appointments/${appointmentId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = (await response.json()) as {
        appointment?: CounselorAppointment;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to cancel session.");
      }

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, status: json.appointment?.status ?? "cancelled" }
            : appointment,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel session.");
    } finally {
      setCancellingId(null);
    }
  };

  const renderAppointment = (appointment: CounselorAppointment) => (
    <article
      key={appointment.id}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveCounselorImage(appointment.counselorImage)}
            alt={appointment.counselorName ?? "Coach"}
            className="h-14 w-14 rounded-full object-cover"
          />
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {appointment.counselorName ?? "Life Coach/Counsellor"}
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {appointment.counselorTitle ?? "Life Coach/Counsellor"}
              </p>
            </div>
            {appointment.counselorSpecialty && (
              <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                {appointment.counselorSpecialty}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4" />
                {formatAppointmentDate(appointment.appointmentDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {appointment.appointmentTime}
              </span>
              {appointment.counselorLocation && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {appointment.counselorLocation}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <span
            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
              appointment.status === "scheduled"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : appointment.status === "completed"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {appointment.status}
          </span>
          {appointment.meetingLink ? (
            <a
              href={appointment.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
            >
              <Video className="h-4 w-4" />
              Join Google Meet
            </a>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              <Video className="h-4 w-4" />
              Meeting link pending
            </div>
          )}
          {isUpcoming(appointment) && (
            <button
              type="button"
              disabled={cancellingId === appointment.id}
              onClick={() => cancelAppointment(appointment.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              <XCircle className="h-4 w-4" />
              {cancellingId === appointment.id ? "Cancelling..." : "Cancel session"}
            </button>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
            <CalendarCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Sessions</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and manage your booked life coach/counsellor sessions.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</p>
      ) : appointments.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No sessions booked yet</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Choose a coach and book a free 20-minute session when you are ready.
          </p>
          <Link
            href="/help-me"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Find a coach
          </Link>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming</h2>
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map(renderAppointment)
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                You do not have any upcoming sessions.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">History</h2>
            {pastAppointments.length > 0 ? (
              pastAppointments.map(renderAppointment)
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Past and cancelled sessions will appear here.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
