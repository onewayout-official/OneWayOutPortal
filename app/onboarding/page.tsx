"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { storage } from "@/lib/storage";
import { profileHasPhone } from "@/lib/phone";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    storage.getProfile().then((profile) => {
      if (!profile) return;
      if (!profileHasPhone(profile.phone)) {
        router.replace("/complete-profile");
        return;
      }
      if (profile.onboardingCompleted) {
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
