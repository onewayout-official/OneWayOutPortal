"use client";

import { useEffect, useState } from "react";
import CounselorProfile from "@/components/CounselorProfile";
import { Counselor } from "@/lib/counselors";
import { MOCK_COUNSELORS } from "@/lib/mockCounselors";
import { getAuthHeader } from "@/lib/authHeader";

export default function CounselorDetail({ counselorId }: { counselorId: string }) {
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCounselor() {
      try {
        const headers = await getAuthHeader();
        const response = await fetch(`/api/counselors/${counselorId}`, { method: "GET", headers });
        if (response.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!response.ok) {
          const fallback = MOCK_COUNSELORS.find((item) => item.id === counselorId) ?? null;
          if (!cancelled) {
            setCounselor(fallback);
            setNotFound(!fallback);
          }
          return;
        }
        const json = (await response.json()) as { counselor?: Counselor };
        if (!cancelled) {
          setCounselor(json.counselor ?? null);
          setNotFound(!json.counselor);
        }
      } catch {
        const fallback = MOCK_COUNSELORS.find((item) => item.id === counselorId) ?? null;
        if (!cancelled) {
          setCounselor(fallback);
          setNotFound(!fallback);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadCounselor();
    return () => {
      cancelled = true;
    };
  }, [counselorId]);

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading counselor...</p>;
  }

  if (notFound || !counselor) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Counselor not found</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This coach may be inactive or no longer available.
        </p>
      </div>
    );
  }

  return <CounselorProfile counselor={counselor} />;
}
