"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import CompleteProfileForm from "@/components/CompleteProfileForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { storage } from "@/lib/storage";
import { getPostAuthDestination } from "@/lib/authRouting";
import { profileHasPhone } from "@/lib/phone";

export default function CompleteProfilePage() {
  const router = useRouter();

  useEffect(() => {
    storage.getProfile().then((profile) => {
      if (profile && profileHasPhone(profile.phone)) {
        router.replace(getPostAuthDestination(profile));
      }
    });
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="auth-page">
        <aside className="auth-hero">
          <div className="hero-brand hero-brand-centered">
            <img
              src="/onewayout-logo.png"
              alt="One Way Out"
              className="hero-logo-image"
            />
          </div>

          <h2 className="hero-tagline">
            Almost <span>there.</span>
          </h2>
          <p className="hero-sub">
            Add your mobile number so we can keep your account secure and stay
            in touch when it matters.
          </p>
        </aside>

        <section className="auth-panel">
          <div className="auth-form-wrapper">
            <div className="auth-form-header">
              <h1>Add your mobile number</h1>
              <p>
                We need your mobile number to finish setting up your account.
              </p>
            </div>

            <CompleteProfileForm />
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
