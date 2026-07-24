import RegisterForm from "@/components/RegisterForm";
import AuthRedirect from "@/components/AuthRedirect";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | One Way Out",
  description: "Create your One Way Out account.",
};

export default function RegisterPage() {
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
            Start your <span>journey.</span>
          </h2>
          <p className="hero-sub">
            Build better money habits from day one. Create your account and
            take the first step toward financial progress.
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
              Quick setup
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
              Safe and secure
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
              Free to start
            </span>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-form-wrapper">
            <div className="auth-form-header">
              <h1>Create your account</h1>
              <p>
                Already have an account?{" "}
                <a href="/login" id="link-login-top">
                  Sign in
                </a>
              </p>
            </div>

            <RegisterForm />
          </div>
        </section>
      </div>
    </AuthRedirect>
  );
}

