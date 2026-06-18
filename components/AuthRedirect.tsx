"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";

export default function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (pathname === "/register") return;

      storage.getProfile().then((profile) => {
        if (profile?.role === "counselor") {
          router.push("/coach");
          return;
        }
        const canUseApp =
          profile && (profile.onboardingCompleted || profile.onboardingSkipped);
        if (canUseApp) {
          router.push("/");
        } else if (pathname !== "/register") {
          router.push("/onboarding");
        }
      });
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // While the router redirect is in-flight, show a spinner instead of blank (fix #7)
  if (isAuthenticated && pathname !== "/register") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


