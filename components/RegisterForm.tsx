"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";

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

function UserIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    setIsLoading(true);
    const result = await register(fullName, form.email.trim(), form.password);

    if (result.success) {
      try {
        const session = await storage.getSession();
        if (session) {
          const profile = {
            id: session.userId,
            name: fullName,
            email: session.email || form.email.trim(),
            phone: form.phone.trim(),
            monthlyIncome: 0,
            createdAt: new Date().toISOString(),
          };
          await storage.saveProfile(profile);
        }
      } catch (err) {
        console.error("Error saving initial profile:", err);
      }

      router.push("/onboarding");
    } else {
      setError(result.error || "Failed to create account");
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    console.log("Google sign-up triggered");
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <button
        id="btn-google-signup"
        type="button"
        className="btn-google"
        onClick={handleGoogleSignup}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="auth-divider">
        <span>or sign up with email</span>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <UserIcon />
            </span>
            <input
              id="firstName"
              name="firstName"
              type="text"
              className="form-input"
              placeholder="John"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <UserIcon />
            </span>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className="form-input"
              placeholder="Doe"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              required
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <div className="input-wrapper">
          <span className="input-icon">
            <MailIcon />
          </span>
          <input
            id="email"
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
        <label htmlFor="phone">Phone Number</label>
        <div className="input-wrapper">
          <span className="input-icon">
            <PhoneIcon />
          </span>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="form-input"
            placeholder="+264 81 123 4567"
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
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
          <label htmlFor="password">Password</label>
          <Link
            href="/forgot-password"
            className="form-link"
            id="link-forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <div className="input-wrapper">
          <span className="input-icon">
            <LockIcon />
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="form-input"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="input-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            id="btn-toggle-password"
          >
            <EyeIcon off={showPassword} />
          </button>
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <button
        id="btn-signup-submit"
        type="submit"
        className="btn-primary"
        disabled={isLoading}
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </button>

      <div className="form-footer-links">
        <Link href="/login" className="form-link primary" id="link-sign-in">
          Already have an account? Sign in
        </Link>
      </div>

      <p className="terms-note">
        By signing up you agree to our{" "}
        <Link href="/terms" id="link-terms">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" id="link-privacy">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
