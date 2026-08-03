"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

function LockIcon() {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function getRecoveryErrorMessage(errorCode: string | null, errorDescription: string | null) {
  if (errorCode === "otp_expired") {
    return "This password reset link is invalid or has expired. Please request a new password reset email.";
  }

  return errorDescription || "This password reset link is invalid. Please request a new password reset email.";
}

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparingRecovery, setIsPreparingRecovery] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isInvalidLink, setIsInvalidLink] = useState(false);
  const { updatePassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const errorCode = url.searchParams.get("error_code") || hashParams.get("error_code");
        const urlError = url.searchParams.get("error") || hashParams.get("error");
        const errorDescription =
          url.searchParams.get("error_description") || hashParams.get("error_description");

        if (errorCode || urlError) {
          if (!isMounted) return;
          setError(getRecoveryErrorMessage(errorCode || urlError, errorDescription));
          setIsInvalidLink(true);
          return;
        }

        const code = url.searchParams.get("code");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
          window.history.replaceState(null, "", window.location.pathname);
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            throw sessionError;
          }
          window.history.replaceState(null, "", window.location.pathname);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (!session) {
          setError(
            "This password reset link is invalid or has expired. Please request a new password reset email."
          );
          setIsInvalidLink(true);
          return;
        }

        setHasRecoverySession(true);
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Unable to verify this password reset link.";
        setError(message);
        setIsInvalidLink(true);
      } finally {
        if (isMounted) {
          setIsPreparingRecovery(false);
        }
      }
    }

    prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hasRecoverySession || isInvalidLink) {
      setError("Please request a new password reset email before updating your password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(password);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Failed to update password.");
      setIsLoading(false);
    }
  };

  const formDisabled = isPreparingRecovery || isInvalidLink || !hasRecoverySession;

  return (
    <div>
      {isPreparingRecovery ? (
        <p className="terms-note" style={{ marginTop: 0, textAlign: "left" }}>
          Verifying your password reset link...
        </p>
      ) : null}

      {error ? <p className="terms-note" style={{ marginTop: 0, color: "var(--danger)" }}>{error}</p> : null}

      {isInvalidLink ? (
        <div className="form-footer-links" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
          <Link href="/forgot-password" className="form-link primary" id="link-request-new-reset">
            Request a new reset link
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleUpdatePassword} noValidate>
        <div className="form-group">
          <label htmlFor="reset-password">New Password</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <LockIcon />
            </span>
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder="Enter a new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={formDisabled}
              required
              autoComplete="new-password"
              minLength={6}
            />
            <button
              type="button"
              className="input-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              id="btn-toggle-reset-password"
              disabled={formDisabled}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reset-confirm-password">Confirm New Password</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <LockIcon />
            </span>
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className="form-input"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={formDisabled}
              required
              autoComplete="new-password"
              minLength={6}
            />
            <button
              type="button"
              className="input-toggle"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              id="btn-toggle-reset-confirm-password"
              disabled={formDisabled}
            >
              <EyeIcon off={showConfirmPassword} />
            </button>
          </div>
        </div>

        <button
          id="btn-reset-password-submit"
          type="submit"
          className="btn-primary"
          disabled={isLoading || formDisabled}
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>

      <div
        className="form-footer-links"
        style={{ justifyContent: "center", marginTop: "1.25rem" }}
      >
        <Link href="/login" className="form-link" id="link-back-to-login-reset">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
