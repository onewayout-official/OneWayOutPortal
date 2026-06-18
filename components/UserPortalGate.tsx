"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function UserPortalGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isCounselor } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isCounselor) {
      router.replace("/coach");
    }
  }, [isCounselor, isLoading, router]);

  if (isLoading || isCounselor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
