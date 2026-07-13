"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { getPostAuthDestination } from "@/lib/authRouting";

export default function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    storage.getProfile().then((profile) => {
      if (cancelled) return;
      if (profile?.role === "counselor") {
        setAllowed(true);
        return;
      }

      const destination = getPostAuthDestination(profile);
      if (destination === "/") {
        setAllowed(true);
      } else {
        router.push(destination);
        setAllowed(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {allowed === false ? "Redirecting..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
