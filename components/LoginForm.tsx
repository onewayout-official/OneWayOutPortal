"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";
import PhoneOTPForm from "@/components/PhoneOTPForm";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

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

type AuthTab = "phone" | "email";

export default function LoginForm() {
  const [activeTab, setActiveTab] = useState<AuthTab>("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const redirectAfterAuth = async () => {
    const profile = await storage.getProfile();
    router.push(profile?.role === "counselor" ? "/coach" : "/");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    const result = await login(form.email, form.password);

    if (result.success) {
      await redirectAfterAuth();
    } else {
      setError(result.error || "Invalid email or password");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log("Google sign-in triggered");
  };

  return (
    <div>
      <button
        id="btn-google-login"
        type="button"
        className="btn-google"
        onClick={handleGoogleLogin}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="auth-divider">
        <span>or continue with</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
        }}
      >
        <button
          type="button"
          className={activeTab === "phone" ? "btn-primary" : "btn-google"}
          style={{ flex: 1, fontSize: "0.85rem" }}
          onClick={() => setActiveTab("phone")}
          id="tab-login-phone"
        >
          Mobile
        </button>
        <button
          type="button"
          className={activeTab === "email" ? "btn-primary" : "btn-google"}
          style={{ flex: 1, fontSize: "0.85rem" }}
          onClick={() => setActiveTab("email")}
          id="tab-login-email"
        >
          Email
        </button>
      </div>

      {activeTab === "phone" ? (
        <PhoneOTPForm mode="login" onSuccess={redirectAfterAuth} submitLabel="Send WhatsApp code" />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <MailIcon />
              </span>
              <input
                id="login-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="john@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label htmlFor="login-password">Password</label>
              <Link
                href="/forgot-password"
                className="form-link"
                id="link-forgot-password-login"
              >
                Forgot password?
              </Link>
            </div>
            <div className="input-wrapper">
              <span className="input-icon">
                <LockIcon />
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                id="btn-toggle-login-password"
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {error ? <p className="terms-note">{error}</p> : null}

          <button
            id="btn-login-submit"
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In with Email"}
          </button>
        </form>
      )}

      <div
        className="form-footer-links"
        style={{ justifyContent: "center", marginTop: "1.25rem" }}
      >
        <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="form-link primary" id="link-create-account">
            Create one
          </Link>
        </span>
      </div>

      <p className="terms-note">
        By signing in you agree to our{" "}
        <Link href="/terms" id="link-terms-login">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" id="link-privacy-login">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
