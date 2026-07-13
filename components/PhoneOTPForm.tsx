"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isValidPhone } from "@/lib/phone";

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

export interface PhoneOTPMetadata {
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
}

interface PhoneOTPFormProps {
  mode: "login" | "signup" | "link";
  metadata?: PhoneOTPMetadata;
  onSuccess?: () => void;
  onCodeSent?: (phone: string) => void;
  beforeSend?: () => string | null;
  submitLabel?: string;
  verifyLabel?: string;
  initialPhone?: string;
  initialStep?: "phone" | "otp";
  hidePhoneStep?: boolean;
}

function defaultVerifyLabel(mode: PhoneOTPFormProps["mode"]) {
  if (mode === "signup") return "Verify & Create Account";
  if (mode === "link") return "Verify & Continue";
  return "Verify & Sign In";
}

export default function PhoneOTPForm({
  mode,
  metadata,
  onSuccess,
  onCodeSent,
  beforeSend,
  submitLabel,
  verifyLabel,
  initialPhone = "",
  initialStep = "phone",
  hidePhoneStep = false,
}: PhoneOTPFormProps) {
  const { sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">(initialStep);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const handleSendOTP = useCallback(async () => {
    setError("");
    const beforeError = beforeSend?.();
    if (beforeError) {
      setError(beforeError);
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Please enter a valid mobile number (e.g. +27 79 123 4567).");
      return;
    }

    setIsLoading(true);
    const result = await sendOTP(phone, metadata, mode);
    setIsLoading(false);

    if (result.success) {
      setStep("otp");
      setResendSeconds(60);
      onCodeSent?.(phone);
    } else {
      setError(result.error ?? "Failed to send OTP.");
    }
  }, [phone, metadata, mode, sendOTP, onCodeSent, beforeSend]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp.trim() || otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setIsLoading(true);
    const result = await verifyOTP(phone, otp, metadata, mode);
    setIsLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error ?? "Invalid OTP code.");
    }
  };

  if (step === "phone" && !hidePhoneStep) {
    return (
      <div>
        <div className="form-group">
          <label htmlFor="otp-phone">Mobile Number</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <PhoneIcon />
            </span>
            <input
              id="otp-phone"
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
            We&apos;ll send a verification code via WhatsApp.
          </p>
        </div>

        {error ? <p className="field-error">{error}</p> : null}

        <button
          type="button"
          className="btn-primary"
          disabled={isLoading}
          onClick={handleSendOTP}
          id="btn-send-whatsapp-otp"
        >
          {isLoading ? "Sending..." : submitLabel ?? "Continue with mobile"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerifyOTP} noValidate>
      <div className="form-group">
        <label htmlFor="otp-code">Verification Code</label>
        <p className="terms-note" style={{ marginBottom: "0.5rem" }}>
          Enter the 6-digit code sent to {phone} on WhatsApp.
        </p>
        <input
          id="otp-code"
          name="otp"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          className="form-input"
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoComplete="one-time-code"
          required
        />
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={isLoading}
        id="btn-verify-whatsapp-otp"
      >
        {isLoading ? "Verifying..." : verifyLabel ?? defaultVerifyLabel(mode)}
      </button>

      <div className="form-footer-links" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="form-link"
          disabled={resendSeconds > 0 || isLoading}
          onClick={handleSendOTP}
          id="btn-resend-whatsapp-otp"
        >
          {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
        </button>
        <button
          type="button"
          className="form-link"
          onClick={() => {
            setStep("phone");
            setOtp("");
            setError("");
          }}
          id="btn-change-phone"
        >
          Change number
        </button>
      </div>
    </form>
  );
}
