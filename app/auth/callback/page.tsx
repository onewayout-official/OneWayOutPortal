"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";
import { getPostAuthDestination } from "@/lib/authRouting";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = url.searchParams.get("code");
        const urlError = url.searchParams.get("error") || hashParams.get("error");
        const errorDescription =
          url.searchParams.get("error_description") || hashParams.get("error_description");

        if (urlError) {
          throw new Error(errorDescription || urlError);
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState(null, "", "/auth/callback");
        } else {
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            window.history.replaceState(null, "", "/auth/callback");
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Sign-in could not be completed. Please try again.");
        }

        const profile = await storage.getProfile();
        if (!isMounted) return;

        router.replace(getPostAuthDestination(profile));
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Sign-in failed.";
        setError(message);
      }
    }

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="auth-page" style={{ justifyContent: "center", padding: "2rem" }}>
        <p className="terms-note">{error}</p>
        <Link href="/login" className="form-link primary">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}
