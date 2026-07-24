"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, History, Mail, Phone, StickyNote, User, Video } from "lucide-react";
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

function sessionTimestamp(appointment: CounselorAppointment) {
  return `${appointment.appointmentDate}T${appointment.appointmentTime.padStart(5, "0")}`;
}

function isHistorySession(appointment: CounselorAppointment, today: string) {
  if (appointment.status === "completed" || appointment.status === "cancelled") {
    return true;
  }
  if (appointment.status !== "scheduled") {
    return true;
  }
  return appointment.appointmentDate < today;
}

function SessionNotesBox({
  appointmentId,
  initialNotes,
  onSave,
  readOnly,
}: {
  appointmentId: string;
  initialNotes: string;
  onSave?: (appointmentId: string, coachNotes: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, appointmentId]);

  const isDirty = notes !== initialNotes;

  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(appointmentId, notes);
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save notes.");
    } finally {
      setIsSaving(false);
    }
  }, [appointmentId, notes, onSave, readOnly]);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
      <label
        htmlFor={`session-notes-${appointmentId}`}
        className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200"
      >
        <StickyNote className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        Session notes
      </label>
      <textarea
        id={`session-notes-${appointmentId}`}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        readOnly={readOnly || !onSave}
        rows={4}
        placeholder="Add follow-ups, topics covered, or context for your next session with this client..."
        className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      {!readOnly && onSave && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save notes"}
          </button>
          {savedAt && !isDirty && !saveError && (
            <span className="text-xs text-green-700 dark:text-green-400">Notes saved</span>
          )}
          {saveError && <span className="text-xs text-red-600 dark:text-red-400">{saveError}</span>}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  today,
  showNotes = false,
  onSaveSessionNote,
}: {
  appointment: CounselorAppointment;
  today: string;
  showNotes?: boolean;
  onSaveSessionNote?: (appointmentId: string, coachNotes: string) => Promise<void>;
}) {
  return (
    <article className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
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

        {appointment.status === "scheduled" && !isHistorySession(appointment, today) ? (
          appointment.meetingLink ? (
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
          )
        ) : null}
      </div>

      {showNotes && (
        <SessionNotesBox
          appointmentId={appointment.id}
          initialNotes={appointment.coachNotes ?? ""}
          onSave={onSaveSessionNote}
        />
      )}
    </article>
  );
}

type CoachDashboardContentProps = {
  appointments: CounselorAppointment[];
  coachName: string;
  isLoading?: boolean;
  error?: string | null;
  demoBanner?: string;
  onSaveSessionNote?: (appointmentId: string, coachNotes: string) => Promise<void>;
};

export default function CoachDashboardContent({
  appointments,
  coachName,
  isLoading = false,
  error = null,
  demoBanner,
  onSaveSessionNote,
}: CoachDashboardContentProps) {
  const [demoNoteOverrides, setDemoNoteOverrides] = useState<Record<string, string>>({});

  const displayAppointments = useMemo(() => {
    if (!demoBanner) return appointments;
    return appointments.map((appointment) => ({
      ...appointment,
      coachNotes: demoNoteOverrides[appointment.id] ?? appointment.coachNotes ?? "",
    }));
  }, [appointments, demoBanner, demoNoteOverrides]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const upcomingAppointments = useMemo(() => {
    return displayAppointments
      .filter(
        (appointment) =>
          appointment.status === "scheduled" && appointment.appointmentDate >= today
      )
      .sort((a, b) => sessionTimestamp(a).localeCompare(sessionTimestamp(b)));
  }, [displayAppointments, today]);

  const sessionHistory = useMemo(() => {
    return displayAppointments
      .filter((appointment) => isHistorySession(appointment, today))
      .sort((a, b) => sessionTimestamp(b).localeCompare(sessionTimestamp(a)));
  }, [displayAppointments, today]);

  const uniqueClients = useMemo(() => {
    const map = new Map<string, CounselorAppointment>();
    for (const appointment of displayAppointments) {
      if (!map.has(appointment.userId)) {
        map.set(appointment.userId, appointment);
      }
    }
    return [...map.values()];
  }, [displayAppointments]);

  const handleSaveNotes = useCallback(
    async (appointmentId: string, coachNotes: string) => {
      if (demoBanner) {
        setDemoNoteOverrides((current) => ({ ...current, [appointmentId]: coachNotes }));
        return;
      }
      if (!onSaveSessionNote) {
        throw new Error("Saving notes is not available.");
      }
      await onSaveSessionNote(appointmentId, coachNotes);
    },
    [demoBanner, onSaveSessionNote]
  );

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
              Welcome, {coachName}. Manage upcoming sessions and review your booking history with
              clients.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total bookings</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{displayAppointments.length}</p>
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming sessions</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Scheduled appointments that have not taken place yet.
        </p>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading appointments...</p>
        ) : upcomingAppointments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No upcoming sessions. New bookings will appear here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {upcomingAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} today={today} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-700">
            <History className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bookings / sessions history
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Past and completed sessions with each client. Add private notes to remember what you
              covered and plan follow-ups.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading history...</p>
        ) : sessionHistory.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No session history yet. Completed or past bookings will show here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {sessionHistory.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                today={today}
                showNotes
                onSaveSessionNote={handleSaveNotes}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
