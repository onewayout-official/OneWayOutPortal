import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import AuthRedirect from "@/components/AuthRedirect";

export const metadata: Metadata = {
  title: "Sign In | One Way Out",
  description: "Sign in to your One Way Out account.",
};

export default function LoginPage() {
  return (
    <AuthRedirect>
      <div className="auth-page">
        <aside className="auth-hero">
          <div className="hero-brand">
            <div className="hero-brand-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
            <span className="hero-brand-name">One Way Out</span>
          </div>

          <h2 className="hero-tagline">
            Welcome <span>back.</span>
          </h2>
          <p className="hero-sub">
            Pick up right where you left off. Your financial journey is waiting
            - sign in and keep moving forward.
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
              Secure login
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
              Always free
            </span>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-form-wrapper">
            <div className="auth-form-header">
              <h1>Sign in to your account</h1>
              <p>
                New to One Way Out?{" "}
                <a href="/register" id="link-signup-top">
                  Create an account
                </a>
              </p>
            </div>

            <LoginForm />
          </div>
        </section>
      </div>
    </AuthRedirect>
  );
}

