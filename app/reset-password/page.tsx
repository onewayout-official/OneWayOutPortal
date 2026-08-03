import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Update Password | One Way Out",
  description: "Set a new password for your One Way Out account.",
};

export default function ResetPasswordPage() {
  return (
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
          Secure your <span>account.</span>
        </h2>
        <p className="hero-sub">
          Choose a strong new password so you can get back to your financial
          journey with confidence.
        </p>

        <div className="hero-badges">
          <span className="hero-badge">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Encrypted
          </span>
          <span className="hero-badge">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Link expires for safety
          </span>
          <span className="hero-badge">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Quick reset
          </span>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <h1>Update your password</h1>
            <p>Enter a new password below to finish resetting your account.</p>
          </div>

          <ResetPasswordForm />
        </div>
      </section>
    </div>
  );
}
