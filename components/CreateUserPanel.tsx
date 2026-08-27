"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, UserPlus } from "lucide-react";
import { getAuthHeader } from "@/lib/authHeader";
import {
  EMPTY_ONBOARDING_ANSWERS,
  isOnboardingComplete,
  ONBOARDING_STEP_META,
  ONBOARDING_STEP_OPTIONS,
  type OnboardingAnswers,
} from "@/lib/onboarding";

interface CreateUserResponse {
  user?: { id: string; name: string; email: string };
  error?: string;
}

export default function CreateUserPanel() {
  const router = useRouter();
  const [isForbidden, setIsForbidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("0");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [markOnboardingComplete, setMarkOnboardingComplete] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingAnswers>(EMPTY_ONBOARDING_ANSWERS);

  const onboardingComplete = useMemo(() => isOnboardingComplete(onboarding), [onboarding]);

  const updateOnboarding = (key: keyof OnboardingAnswers, value: string) => {
    setOnboarding((prev) => ({
      ...prev,
      [key]: value === "" ? null : value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (markOnboardingComplete && !onboardingComplete) {
      setError("Please complete all onboarding steps before marking onboarding as complete.");
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch("/api/users-admin/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone.trim() || null,
          password,
          monthlyIncome: Number(monthlyIncome || 0),
          sendWelcomeEmail,
          markOnboardingComplete,
          onboarding,
        }),
      });

      const json = (await response.json()) as CreateUserResponse;
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to create user.");
      }

      router.push(`/users/${json.user?.id ?? ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isForbidden) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-600 dark:text-amber-300" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-amber-900 dark:text-amber-200">Access Denied</h1>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You do not have permission to create users.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/30">
            <UserPlus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create User</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Register a new member account and optionally complete their onboarding profile on their behalf.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              required
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              required
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              required
              type="tel"
              placeholder="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              required
              minLength={6}
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="number"
              min={0}
              placeholder="Monthly income"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={sendWelcomeEmail}
              onChange={(e) => setSendWelcomeEmail(e.target.checked)}
            />
            Send welcome email to the new user
          </label>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Onboarding Profile</h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Complete the member&apos;s onboarding answers here. If left incomplete, they will be guided through onboarding on first sign-in.
          </p>

          <div className="space-y-4">
            {ONBOARDING_STEP_META.map((meta, index) => {
              const step = (index + 1) as keyof typeof ONBOARDING_STEP_OPTIONS;
              const fieldKey = meta.key as keyof OnboardingAnswers;
              const options = ONBOARDING_STEP_OPTIONS[step];

              return (
                <div key={meta.key} className="rounded-lg border border-gray-100 p-4 dark:border-gray-700">
                  <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                    Step {step}: {meta.title}
                  </label>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{meta.subtitle}</p>
                  <select
                    value={onboarding[fieldKey] ?? ""}
                    onChange={(e) => updateOnboarding(fieldKey, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">— Select an option —</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.emoji} {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <label className="mt-4 flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              className="mt-1"
              checked={markOnboardingComplete}
              onChange={(e) => setMarkOnboardingComplete(e.target.checked)}
              disabled={!onboardingComplete}
            />
            <span>
              Mark onboarding as complete
              {!onboardingComplete && (
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  All seven onboarding steps must be answered first.
                </span>
              )}
            </span>
          </label>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? "Creating user..." : "Create User"}
          </button>
          <Link
            href="/users"
            className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
