import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import AuthRedirect from "@/components/AuthRedirect";

export const metadata: Metadata = {
  title: "Reset Password | One Way Out",
  description: "Request a password reset link for your One Way Out account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthRedirect>
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
            We&apos;ll help you <span>get back in.</span>
          </h2>
          <p className="hero-sub">
            Enter the email on your account and we&apos;ll send a secure link to
            reset your password.
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
              Secure link
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
              Expires automatically
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
              Your data is safe
            </span>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-form-wrapper">
            <div className="auth-form-header">
              <h1>Reset your password</h1>
              <p>
                Remember it?{" "}
                <a href="/login" id="link-login-forgot">
                  Sign in
                </a>
              </p>
            </div>

            <ForgotPasswordForm />
          </div>
        </section>
      </div>
    </AuthRedirect>
  );
}
