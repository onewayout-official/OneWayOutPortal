"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Mail, Phone, User, Video, ShieldAlert } from "lucide-react";
import { CounselorAppointment } from "@/lib/counselors";
import { getAuthHeader } from "@/lib/authHeader";
import { storage } from "@/lib/storage";

function formatAppointmentDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CoachDashboard() {
  const [appointments, setAppointments] = useState<CounselorAppointment[]>([]);
  const [coachName, setCoachName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await storage.getProfile();
      setCoachName(profile?.name ?? "Coach");

      const headers = await getAuthHeader();
      const response = await fetch("/api/coach/appointments", { method: "GET", headers });
      const json = (await response.json()) as {
        appointments?: CounselorAppointment[];
        error?: string;
      };

      if (response.status === 403) {
        setIsForbidden(true);
        setAppointments([]);
        return;
      }

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load appointments.");
      }

      setIsForbidden(false);
      setAppointments(json.appointments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return appointments.filter(
      (appointment) =>
        appointment.status === "scheduled" && appointment.appointmentDate >= today
    );
  }, [appointments]);

  const uniqueClients = useMemo(() => {
    const map = new Map<string, CounselorAppointment>();
    for (const appointment of appointments) {
      if (!map.has(appointment.userId)) {
        map.set(appointment.userId, appointment);
      }
    }
    return [...map.values()];
  }, [appointments]);

  if (isForbidden) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-600 dark:text-amber-300" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-amber-900 dark:text-amber-200">Coach profile not linked</h1>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Your login account is not linked to a counselor profile yet. Ask the admin to link your
              account email in Manage Coaches.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-teal-100 p-3 dark:bg-teal-900/30">
            <CalendarCheck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coach Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome, {coachName}. Here are the users who booked sessions with you.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total bookings</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{appointments.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Upcoming sessions</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{upcomingAppointments.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Unique clients</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{uniqueClients.length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Booked users</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Users who have booked an appointment with you.
        </p>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No appointments yet. Users will appear here after they book a session with you.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {appointment.userName || "Portal user"}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          appointment.status === "scheduled"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : appointment.status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        {appointment.userName || "Unknown user"}
                      </span>
                      {appointment.userEmail && (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-4 w-4" />
                          {appointment.userEmail}
                        </span>
                      )}
                      {appointment.userPhone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-4 w-4" />
                          {appointment.userPhone}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {formatAppointmentDate(appointment.appointmentDate)} at {appointment.appointmentTime}
                    </p>
                  </div>

                  {appointment.meetingLink && (
                    <a
                      href={appointment.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Video className="h-4 w-4" />
                      Join session
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
