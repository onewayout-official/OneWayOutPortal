"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, User, UserX, UserCheck } from "lucide-react";
import { getAuthHeader } from "@/lib/authHeader";
import type { ProfileStatus } from "@/lib/profileStatus";

interface UserDetail {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: "admin" | "user";
  status: ProfileStatus;
  monthlyIncome: number;
  savingsGoal: number | null;
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  userPoints: number;
  totalPoints: number;
  walletBalance: number;
  membership: string | null;
  createdAt: string;
  mood: string | null;
  capital: number | null;
  debts: number | null;
  lastIncome: number | null;
  lastExpenses: number | null;
  incomeGoals: number | null;
  savingGoals: number | null;
  debtStatus: string | null;
  savingsStatus: string | null;
  investmentStatus: string | null;
  incomeStability: string | null;
  emergencyResilience: string | null;
  primaryGoal: string | null;
  workNumber: string | null;
  homeNumber: string | null;
  workEmail: string | null;
  dateOfBirth: string | null;
  occupation: string | null;
  employer: string | null;
  gender: string | null;
  maritalStatus: string | null;
  bankName: string | null;
  bankAccountType: string | null;
}

interface UserDetailResponse {
  user?: UserDetail;
  error?: string;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{display}</dd>
    </div>
  );
}

export default function UserDetailPanel({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/users-admin/users/${userId}`, {
        method: "GET",
        headers,
      });
      const json = (await response.json()) as UserDetailResponse;
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to load user.");
      setUser(json.user ?? null);
      setPhoneDraft(json.user?.phone ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleStatusChange = async (status: ProfileStatus) => {
    if (!user) return;

    const isSuspending = status === "suspended";
    const confirmed = window.confirm(
      isSuspending
        ? `Suspend ${user.email}? They will not be able to sign in, but their data will be kept.`
        : `Reactivate ${user.email}? They will be able to sign in again.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/users-admin/users/${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      const json = (await response.json()) as UserDetailResponse;
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to update user status.");
      setUser(json.user ?? null);
      setSuccess(
        isSuspending
          ? `${user.email} has been suspended.`
          : `${user.email} has been reactivated.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSave = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      `Save and verify mobile number for ${user.email}? The user will not need WhatsApp verification on login.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`/api/users-admin/users/${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ phone: phoneDraft }),
      });
      const json = (await response.json()) as UserDetailResponse;
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      if (!response.ok) throw new Error(json.error ?? "Failed to update mobile number.");
      setUser(json.user ?? null);
      setPhoneDraft(json.user?.phone ?? phoneDraft);
      setSuccess("Mobile number saved and marked as verified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mobile number.");
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
              You do not have permission to view this user profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading user profile...</p>;
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <p className="text-sm text-gray-500 dark:text-gray-400">User not found.</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error ?? "Failed to load user."}
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

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
          {success}
        </div>
      )}

      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/30">
              <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.name || `${user.firstName} ${user.lastName}`.trim() || "User Profile"}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user.status === "active" ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleStatusChange("suspended")}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/20"
              >
                <UserX className="h-4 w-4" /> Suspend User
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleStatusChange("active")}
                className="inline-flex items-center gap-1 rounded-lg border border-green-200 px-3 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-60 dark:border-green-900/30 dark:text-green-300 dark:hover:bg-green-900/20"
              >
                <UserCheck className="h-4 w-4" /> Reactivate User
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Rewards & Wallet</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailRow label="Wallet Balance" value={`R ${formatCurrency(user.walletBalance)}`} />
          <DetailRow label="Total Points" value={user.totalPoints.toLocaleString()} />
          <DetailRow label="User Points" value={user.userPoints.toLocaleString()} />
          <DetailRow label="Membership" value={user.membership} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Mobile number
            </label>
            <input
              type="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="+27 82 123 4567"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            type="button"
            disabled={isSubmitting || !phoneDraft.trim()}
            onClick={handlePhoneSave}
            className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
          >
            Save mobile
          </button>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Full Name" value={user.name} />
          <DetailRow label="First Name" value={user.firstName} />
          <DetailRow label="Last Name" value={user.lastName} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Phone" value={user.phone} />
          <DetailRow label="Status" value={user.status === "active" ? "Active" : "Suspended"} />
          <DetailRow label="Role" value={user.role} />
          <DetailRow label="Onboarding" value={user.onboardingCompleted ? "Completed" : "Pending"} />
          <DetailRow label="Monthly Income" value={user.monthlyIncome} />
          <DetailRow label="Savings Goal" value={user.savingsGoal} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Financial Overview</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Capital" value={user.capital} />
          <DetailRow label="Debts" value={user.debts} />
          <DetailRow label="Last Income" value={user.lastIncome} />
          <DetailRow label="Last Expenses" value={user.lastExpenses} />
          <DetailRow label="Income Goals" value={user.incomeGoals} />
          <DetailRow label="Saving Goals" value={user.savingGoals} />
          <DetailRow label="Debt Status" value={user.debtStatus} />
          <DetailRow label="Savings Status" value={user.savingsStatus} />
          <DetailRow label="Investment Status" value={user.investmentStatus} />
          <DetailRow label="Income Stability" value={user.incomeStability} />
          <DetailRow label="Emergency Resilience" value={user.emergencyResilience} />
          <DetailRow label="Primary Goal" value={user.primaryGoal} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Personal & Contact</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Date of Birth" value={formatDate(user.dateOfBirth)} />
          <DetailRow label="Gender" value={user.gender} />
          <DetailRow label="Marital Status" value={user.maritalStatus} />
          <DetailRow label="Occupation" value={user.occupation} />
          <DetailRow label="Employer" value={user.employer} />
          <DetailRow label="Work Number" value={user.workNumber} />
          <DetailRow label="Home Number" value={user.homeNumber} />
          <DetailRow label="Work Email" value={user.workEmail} />
          <DetailRow label="Mood" value={user.mood} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Banking</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DetailRow label="Bank Name" value={user.bankName} />
          <DetailRow label="Account Type" value={user.bankAccountType} />
        </dl>
      </section>
    </div>
  );
}
