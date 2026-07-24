"use client";

import { useMemo } from "react";
import { CalendarCheck, Mail, Phone, User, Video } from "lucide-react";
import { CounselorAppointment } from "@/lib/counselors";

function formatAppointmentDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type CoachDashboardContentProps = {
  appointments: CounselorAppointment[];
  coachName: string;
  isLoading?: boolean;
  error?: string | null;
  demoBanner?: string;
};

export default function CoachDashboardContent({
  appointments,
  coachName,
  isLoading = false,
  error = null,
  demoBanner,
}: CoachDashboardContentProps) {
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

  return (
    <div className="space-y-6">
      {demoBanner && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-200">
          {demoBanner}
        </div>
      )}

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

                  {appointment.meetingLink ? (
                    <a
                      href={appointment.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                    >
                      <Video className="h-4 w-4" />
                      Join Teams meeting
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      <Video className="h-4 w-4" />
                      Teams link pending
                    </div>
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
