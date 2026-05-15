"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { storage } from "@/lib/storage";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    storage.getProfile().then((profile) => {
      if (profile && profile.onboardingCompleted) {
        router.push("/");
      }
    });
  }, [router]);

  return (
    <ProtectedRoute>
      <OnboardingForm />
    </ProtectedRoute>
  );
}

