"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { storage } from "@/lib/storage";
import Link from "next/link";
import {
  Wallet,
  Banknote,
  GraduationCap,
  MessageSquareQuote,
  Star,
  Video,
  Heart,
  Calculator,
  Flag,
  Coins,
  CheckCircle,
} from "lucide-react";

type TaskId =
  | "update-budget"
  | "record-debt-payment"
  | "complete-course"
  | "request-quote"
  | "leave-feedback"
  | "register-webinar"
  | "book-life-counseling"
  | "book-financial-planning"
  | "report-abuse";

const TASKS: Array<{
  id: TaskId;
  label: string;
  points: number | null;
  icon: typeof Wallet;
  href?: string;
}> = [
  { id: "update-budget", label: "Update Budget", points: 50, icon: Wallet, href: "/budget" },
  { id: "record-debt-payment", label: "Record a debt payment", points: 100, icon: Banknote, href: "/review-debt" },
  { id: "complete-course", label: "Complete Course", points: 50, icon: GraduationCap },
  { id: "request-quote", label: "Request Quote", points: null, icon: MessageSquareQuote },
  { id: "leave-feedback", label: "Leave verified feedback", points: null, icon: Star },
  { id: "register-webinar", label: "Register for upcoming webinar", points: null, icon: Video },
  { id: "book-life-counseling", label: "Book life counseling appointment", points: null, icon: Heart },
  { id: "book-financial-planning", label: "Book financial planning appointment", points: null, icon: Calculator, href: "/financial-plan" },
  { id: "report-abuse", label: "Report Abuse", points: null, icon: Flag },
];

export default function EarnTracker() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completingId, setCompletingId] = useState<TaskId | null>(null);
  const [showClaimed, setShowClaimed] = useState<TaskId | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isWebinarModalOpen, setIsWebinarModalOpen] = useState(false);
  const [webinarName, setWebinarName] = useState("");
  const [webinarEmail, setWebinarEmail] = useState("");
  const [webinarPhone, setWebinarPhone] = useState("");
  const [webinarTopic, setWebinarTopic] = useState("");
  const [webinarDate, setWebinarDate] = useState("");
  const [webinarNotes, setWebinarNotes] = useState("");
  const [webinarSuccess, setWebinarSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const userProfile = await storage.getProfile();
    setProfile(userProfile);
    setIsLoading(false);
  };

  const handleTaskClick = async (task: (typeof TASKS)[0]) => {
    // Update Budget should always open Budget Manager directly.
    if ((task.id === "update-budget" || task.id === "record-debt-payment") && task.href) {
      window.location.href = task.href;
      return;
    }

    if (task.id === "leave-feedback") {
      setIsFeedbackModalOpen(true);
      setFeedbackSuccess(false);
      return;
    }
    if (task.id === "register-webinar") {
      setIsWebinarModalOpen(true);
      setWebinarSuccess(false);
      return;
    }

    if (task.points !== null && task.points > 0) {
      const confirmed = window.confirm(
        `Have you completed "${task.label}"? You will earn ${task.points} points.`
      );
      if (!confirmed) return;
      if (!profile) return;
      setCompletingId(task.id);
      const newPoints = (profile.userPoints ?? 0) + task.points;
      const updated = { ...profile, userPoints: newPoints };
      await storage.saveProfile(updated);
      setProfile(updated);
      setCompletingId(null);
      setShowClaimed(task.id);
      setTimeout(() => setShowClaimed(null), 2000);
    }
    // No-point tasks: could navigate or show toast
    if (task.href && task.points === null) {
      window.location.href = task.href;
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedbackSuccess(true);
    setFeedbackName("");
    setFeedbackText("");
    setTimeout(() => {
      setIsFeedbackModalOpen(false);
      setFeedbackSuccess(false);
    }, 1200);
  };

  const handleWebinarSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWebinarSuccess(true);
    setWebinarName("");
    setWebinarEmail("");
    setWebinarPhone("");
    setWebinarTopic("");
    setWebinarDate("");
    setWebinarNotes("");
    setTimeout(() => {
      setIsWebinarModalOpen(false);
      setWebinarSuccess(false);
    }, 1400);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // const userPoints = profile?.userPoints ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
          <Coins className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earn</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Complete tasks to earn points. Redeem them on the Spend screen.
          </p>
        </div>
      </div>

      {/*
      <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Your points</p>
            <p className="text-3xl font-bold">{userPoints.toLocaleString()}</p>
          </div>
          <Coins className="h-10 w-10 opacity-80" />
        </div>
        <Link
          href="/spend"
          className="mt-3 inline-block text-sm font-medium opacity-90 hover:underline"
        >
          Redeem on Spend →
        </Link>
      </div>
      */}

      {/* Task grid: icon on top of each button */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {TASKS.map((task) => {
            const Icon = task.icon;
            const isCompleting = completingId === task.id;
            const justClaimed = showClaimed === task.id;
            const hasPoints = task.points !== null && task.points > 0;

            const buttonContent = (
              <>
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-2 ${
                    hasPoints
                      ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-2">
                  {task.label}
                </span>
                {hasPoints && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {task.points} points
                  </span>
                )}
                {justClaimed && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Claimed
                  </span>
                )}
              </>
            );

            return (
              <div key={task.id} className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={isCompleting}
                  onClick={() => handleTaskClick(task)}
                  className="w-full flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all disabled:opacity-60"
                >
                  {isCompleting ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                      <span className="text-xs text-gray-500">Adding points...</span>
                    </div>
                  ) : (
                    buttonContent
                  )}
                </button>
                {task.href && (
                  <Link
                    href={task.href}
                    className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Go to task →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-5 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leave verified feedback</h3>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Feedback
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Write your feedback..."
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  Submit
                </button>
              </div>
              {feedbackSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">Feedback submitted. Thank you.</p>
              )}
            </form>
          </div>
        </div>
      )}

      {isWebinarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-5 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register for upcoming webinar</h3>
              <button
                type="button"
                onClick={() => setIsWebinarModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleWebinarSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={webinarName}
                    onChange={(e) => setWebinarName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={webinarEmail}
                    onChange={(e) => setWebinarEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={webinarPhone}
                    onChange={(e) => setWebinarPhone(e.target.value)}
                    placeholder="+264..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preferred date
                  </label>
                  <input
                    type="date"
                    value={webinarDate}
                    onChange={(e) => setWebinarDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Webinar topic
                </label>
                <select
                  value={webinarTopic}
                  onChange={(e) => setWebinarTopic(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="" disabled>Select a topic</option>
                  <option value="budgeting-basics">Budgeting basics</option>
                  <option value="debt-management">Debt management</option>
                  <option value="income-growth">Income growth strategies</option>
                  <option value="financial-planning">Personal financial planning</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Additional notes
                </label>
                <textarea
                  value={webinarNotes}
                  onChange={(e) => setWebinarNotes(e.target.value)}
                  placeholder="Tell us what you want to learn in this webinar..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsWebinarModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  Register
                </button>
              </div>

              {webinarSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">Registration submitted. We will contact you soon.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
