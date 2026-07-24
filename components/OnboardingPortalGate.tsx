"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { storage } from "@/lib/storage";

/**
 * When the user skipped onboarding, shows a reminder banner and blocks interaction
 * with page content until they complete setup (applies to all AppLayout routes).
 */
export default function OnboardingPortalGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    storage.getProfile().then((profile) => {
      if (cancelled) return;
      if (profile?.role === "counselor") {
        setBlocked(false);
        return;
      }
      setBlocked(Boolean(profile?.onboardingSkipped && !profile?.onboardingCompleted));
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      {blocked && (
        <div className="mb-4 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-600 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm">
              Complete your onboarding setup to unlock the full portal and accurate financial tools.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 inline-flex justify-center items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Complete setup
          </Link>
        </div>
      )}

      <div className={blocked ? "relative min-h-[50vh]" : undefined}>
        <div className={blocked ? "pointer-events-none select-none opacity-50" : undefined}>
          {children}
        </div>
        {blocked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-gray-50/85 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="max-w-md rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 p-6 shadow-lg text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Complete onboarding to use the portal
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Finish setup to access dashboards, budgets, and the rest of your tools.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                Complete setup
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
