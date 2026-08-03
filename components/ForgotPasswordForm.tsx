"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

function MailIcon() {
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
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { resetPasswordForEmail } = useAuth();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    const result = await resetPasswordForEmail(email);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Failed to send reset email");
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <div>
        <p className="terms-note" style={{ marginTop: 0, textAlign: "left", color: "var(--foreground)" }}>
          Password reset link sent to <strong>{email}</strong>. Check your inbox
          (and spam folder), then follow the link to set a new password.
        </p>
        <div
          className="form-footer-links"
          style={{ justifyContent: "center", marginTop: "1.25rem" }}
        >
          <Link href="/login" className="form-link primary" id="link-back-to-login-success">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error ? <p className="terms-note" style={{ marginTop: 0, color: "var(--danger)" }}>{error}</p> : null}

      <form onSubmit={handleResetPassword} noValidate>
        <div className="form-group">
          <label htmlFor="forgot-email">Email Address</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <MailIcon />
            </span>
            <input
              id="forgot-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <button
          id="btn-forgot-password-submit"
          type="submit"
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div
        className="form-footer-links"
        style={{ justifyContent: "center", marginTop: "1.25rem" }}
      >
        <Link href="/login" className="form-link" id="link-back-to-login-forgot">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
