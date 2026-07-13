"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { getPostAuthDestination } from "@/lib/authRouting";
import { formatE164, isValidPhone } from "@/lib/phone";
// OTP linking (re-enable when WHATSAPP_OTP_ENABLED is true):
// import PhoneOTPForm from "@/components/PhoneOTPForm";
// import { WHATSAPP_OTP_ENABLED } from "@/lib/features";

function PhoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.88 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.99 2.8h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17v-.08Z" />
    </svg>
  );
}

export default function CompleteProfileForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Please enter a valid mobile number (e.g. +27 79 123 4567).");
      return;
    }

    setIsLoading(true);
    try {
      const profile = await storage.getProfile();
      if (!profile) {
        setError("Could not load your profile. Please try signing in again.");
        setIsLoading(false);
        return;
      }

      const e164 = formatE164(phone) ?? phone.trim();
      await storage.saveProfile({
        ...profile,
        phone: e164,
      });

      const updated = await storage.getProfile();
      router.replace(getPostAuthDestination(updated));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save mobile number.";
      setError(message);
      setIsLoading(false);
    }
  };

  // --- WhatsApp OTP link flow (disabled until Twilio sender is approved) ---
  // if (WHATSAPP_OTP_ENABLED) {
  //   return (
  //     <PhoneOTPForm
  //       mode="link"
  //       submitLabel="Send verification code"
  //       verifyLabel="Verify & Continue"
  //       onSuccess={async () => {
  //         const profile = await storage.getProfile();
  //         router.replace(getPostAuthDestination(profile));
  //       }}
  //     />
  //   );
  // }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-group">
        <label htmlFor="complete-phone">Mobile Number</label>
        <div className="input-wrapper">
          <span className="input-icon">
            <PhoneIcon />
          </span>
          <input
            id="complete-phone"
            name="phone"
            type="tel"
            className="form-input"
            placeholder="+27 79 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
          />
        </div>
        <p className="terms-note" style={{ marginTop: "0.35rem" }}>
          Enter a South African mobile number in international format.
        </p>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={isLoading}
        id="btn-save-phone"
      >
        {isLoading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
