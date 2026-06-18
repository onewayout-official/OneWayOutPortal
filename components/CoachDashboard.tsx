"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import CoachDashboardContent from "@/components/CoachDashboardContent";
import { CounselorAppointment } from "@/lib/counselors";
import { getAuthHeader } from "@/lib/authHeader";
import { storage } from "@/lib/storage";

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
    <CoachDashboardContent
      appointments={appointments}
      coachName={coachName}
      isLoading={isLoading}
      error={error}
    />
  );
}
