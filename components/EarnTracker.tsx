"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Coins, CheckCircle, Lock, Star } from "lucide-react";
import { storage } from "@/lib/storage";
import {
  EARN_SCREEN_TASKS,
  isTaskCompleted,
  formatPointsDisplay,
  VIDEO_QUIZ_DAILY_CAP,
  type GamificationTaskId,
  type TaskCategory,
} from "@/lib/gamification/config";
import { rewards } from "@/lib/gamification/rewards";
import type { GamificationState } from "@/types";
import SpinWheel from "@/components/SpinWheel";

// Tasks that should navigate to their href on click, regardless of points
const NAVIGATE_ONLY: GamificationTaskId[] = [
  "daily-mood",
  "expense-log",
  "video-quiz",
  "monthly-budget-update",
  "monthly-expenses-update",
  "book-life-counseling",
  "appoint-financial-advisor",
];

const TASK_GROUPS: { key: TaskCategory; label: string; description: string }[] = [
  { key: "daily", label: "Daily", description: "Resets every day" },
  { key: "monthly", label: "Monthly", description: "Resets every month" },
  { key: "as-required", label: "As Required", description: "Complete whenever needed" },
];

const UPCOMING_WEBINARS = [
  {
    id: "budget-reset",
    title: "Monthly Budget Reset Workshop",
    date: "Thursday, 26 June 2026 · 18:00 SAST",
  },
  {
    id: "debt-strategies",
    title: "Practical Debt Payoff Strategies",
    date: "Tuesday, 8 July 2026 · 18:00 SAST",
  },
  {
    id: "savings-habits",
    title: "Building Consistent Savings Habits",
    date: "Thursday, 17 July 2026 · 12:30 SAST",
  },
];

export default function EarnTracker() {
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completingId, setCompletingId] = useState<GamificationTaskId | null>(null);
  const [showClaimed, setShowClaimed] = useState<GamificationTaskId | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Feedback modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Webinar registration modal state
  const [isWebinarModalOpen, setIsWebinarModalOpen] = useState(false);
  const [webinarId, setWebinarId] = useState("");
  const [webinarName, setWebinarName] = useState("");
  const [webinarEmail, setWebinarEmail] = useState("");
  const [webinarPhone, setWebinarPhone] = useState("");
  const [webinarQuestions, setWebinarQuestions] = useState("");
  const [webinarSuccess, setWebinarSuccess] = useState(false);
  const [isWebinarSubmitting, setIsWebinarSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const state = await rewards.getGamificationState();
    setGamification(state);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGamificationUpdate = (next: Partial<GamificationState> & { balance: number }) => {
    setGamification((prev) =>
      prev
        ? {
            ...prev,
            balance: next.balance,
            freeSpinAvailable: next.freeSpinAvailable ?? prev.freeSpinAvailable,
            spinTokens: next.spinTokens ?? prev.spinTokens,
          }
        : null
    );
  };

  const handleTaskClick = async (task: (typeof EARN_SCREEN_TASKS)[0]) => {
    setTaskError(null);

    if (task.id === "leave-feedback") {
      setIsFeedbackModalOpen(true);
      setFeedbackSuccess(false);
      setFeedbackRating(0);
      setFeedbackComment("");
      return;
    }

    if (task.id === "register-webinar") {
      setIsWebinarModalOpen(true);
      setWebinarSuccess(false);
      setWebinarId("");
      setWebinarQuestions("");
      setIsWebinarSubmitting(false);
      const profile = await storage.getProfile();
      setWebinarName(profile?.name ?? "");
      setWebinarEmail(profile?.email ?? "");
      setWebinarPhone(profile?.phone ?? "");
      return;
    }

    if (NAVIGATE_ONLY.includes(task.id) && task.href) {
      window.location.href = task.href;
      return;
    }

    if (task.manualClaim && task.points !== null && task.points > 0) {
      const completed = gamification
        ? isTaskCompleted(task.id, gamification.completedTaskKeys)
        : false;
      if (completed) return;

      const confirmed = window.confirm(
        `Have you completed "${task.label}"? You will earn ${task.points ?? 100} points.`
      );
      if (!confirmed) return;

      setCompletingId(task.id);
      const result = await rewards.awardTask(task.id, {
        metadata:
          task.id === "video-quiz"
            ? { content_id: `manual-${Date.now()}` }
            : undefined,
      });
      storage.logEarnActivity();
      setCompletingId(null);

      if (!result.ok && result.error) {
        setTaskError(
          result.error === "daily_cap_reached"
            ? `Video quiz cap reached (${VIDEO_QUIZ_DAILY_CAP} per day).`
            : result.error
        );
        return;
      }

      if (result.pointsAwarded > 0) {
        setShowClaimed(task.id);
        setTimeout(() => setShowClaimed(null), 2000);
      }

      await loadData();
      return;
    }

    if (task.href && task.points === null) {
      window.location.href = task.href;
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedbackSuccess(true);
    setFeedbackRating(0);
    setFeedbackComment("");
    setTimeout(() => {
      setIsFeedbackModalOpen(false);
      setFeedbackSuccess(false);
    }, 1400);
  };

  const handleWebinarSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsWebinarSubmitting(true);
    setWebinarSuccess(true);
    setIsWebinarSubmitting(false);
    setTimeout(() => {
      setIsWebinarModalOpen(false);
      setWebinarSuccess(false);
      setWebinarId("");
      setWebinarName("");
      setWebinarEmail("");
      setWebinarPhone("");
      setWebinarQuestions("");
    }, 1600);
  };

  const selectedWebinar = UPCOMING_WEBINARS.find((w) => w.id === webinarId);

  if (isLoading || !gamification) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const userPoints = gamification.balance;

  const renderTaskCard = (task: (typeof EARN_SCREEN_TASKS)[0]) => {
    const Icon = task.icon;
    const isCompleting = completingId === task.id;
    const justClaimed = showClaimed === task.id;
    const hasPoints = task.points !== null && task.points > 0;
    const completed = isTaskCompleted(task.id, gamification.completedTaskKeys);
    const isAuto = task.autoAward === true;

    const buttonContent = (
      <>
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-2 ${
            completed
              ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
              : hasPoints
                ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {completed ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-2">
          {task.label}
        </span>
        {hasPoints && !completed && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatPointsDisplay(task.points, task.pointsLabel)}
          </span>
        )}
        {completed && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
            <CheckCircle className="h-3.5 w-3.5" /> Done
          </span>
        )}
        {isAuto && !completed && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-0.5">
            <Lock className="h-3 w-3" /> Auto on complete
          </span>
        )}
        {justClaimed && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
            <CheckCircle className="h-3.5 w-3.5" /> +{task.points} pts
          </span>
        )}
      </>
    );

    return (
      <div key={task.id} className="flex flex-col items-center">
        <button
          type="button"
          disabled={isCompleting || (completed && !task.href)}
          onClick={() => handleTaskClick(task)}
          className="w-full flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all disabled:opacity-60"
        >
          {isCompleting ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-8 w-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
              <span className="text-xs text-gray-500">Claiming...</span>
            </div>
          ) : (
            buttonContent
          )}
        </button>
      </div>
    );
  };

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

      <div className="rounded-xl p-5 border border-sky-200 dark:border-sky-800 bg-gradient-to-r from-sky-50 to-blue-100 dark:from-sky-950/50 dark:to-blue-950/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700 dark:text-sky-300">My 1-Reward Points</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-sky-50">
              {userPoints.toLocaleString()}
            </p>
            {gamification.spinTokens > 0 && (
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                {gamification.spinTokens} spin token{gamification.spinTokens !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Coins className="h-10 w-10 text-sky-500 dark:text-sky-400 opacity-90" />
        </div>
        <Link
          href="/spend"
          className="mt-3 inline-block text-sm font-medium text-blue-700 dark:text-sky-300 hover:underline"
        >
          Redeem on Spend &rarr;
        </Link>
      </div>

      <SpinWheel
        state={gamification}
        onStateChange={handleGamificationUpdate}
        freeSpinOnly
      />

      {taskError && (
        <p className="text-sm text-red-600 dark:text-red-400">{taskError}</p>
      )}

      {TASK_GROUPS.map(({ key, label, description }) => {
        const tasks = EARN_SCREEN_TASKS.filter((t) => t.category === key);
        if (tasks.length === 0) return null;
        return (
          <div key={key}>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {tasks.map(renderTaskCard)}
            </div>
          </div>
        );
      })}

      {/* Webinar registration modal */}
      {isWebinarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register for Webinar</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Tell us which session you&apos;d like to join and how we can reach you.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWebinarModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shrink-0"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleWebinarSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="webinar-select"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Webinar *
                </label>
                <select
                  id="webinar-select"
                  value={webinarId}
                  onChange={(e) => setWebinarId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">Select a webinar</option>
                  {UPCOMING_WEBINARS.map((webinar) => (
                    <option key={webinar.id} value={webinar.id}>
                      {webinar.title}
                    </option>
                  ))}
                </select>
                {selectedWebinar && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedWebinar.date}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="webinar-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Full name *
                </label>
                <input
                  id="webinar-name"
                  type="text"
                  value={webinarName}
                  onChange={(e) => setWebinarName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label
                  htmlFor="webinar-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email address *
                </label>
                <input
                  id="webinar-email"
                  type="email"
                  value={webinarEmail}
                  onChange={(e) => setWebinarEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label
                  htmlFor="webinar-phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Phone number
                </label>
                <input
                  id="webinar-phone"
                  type="tel"
                  value={webinarPhone}
                  onChange={(e) => setWebinarPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div>
                <label
                  htmlFor="webinar-questions"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Questions or topics you&apos;d like covered
                </label>
                <textarea
                  id="webinar-questions"
                  value={webinarQuestions}
                  onChange={(e) => setWebinarQuestions(e.target.value)}
                  placeholder="Share what you hope to learn from this webinar..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsWebinarModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWebinarSubmitting || !webinarId}
                  className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Register
                </button>
              </div>

              {webinarSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  You&apos;re registered! We&apos;ll send details to {webinarEmail}.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Feedback modal — star rating + comment */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Verified Feedback</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How would you rate your experience?</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shrink-0"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      onMouseEnter={() => setFeedbackHover(star)}
                      onMouseLeave={() => setFeedbackHover(0)}
                      className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= (feedbackHover || feedbackRating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-300 dark:fill-gray-600 dark:text-gray-500"
                        }`}
                      />
                    </button>
                  ))}
                  {feedbackRating > 0 && (
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][feedbackRating]}
                    </span>
                  )}
                </div>
                {/* Hidden required input so form validates a star is selected */}
                <input
                  type="number"
                  value={feedbackRating || ""}
                  onChange={() => {}}
                  required
                  min={1}
                  max={5}
                  className="sr-only"
                  aria-hidden="true"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Comment
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Share your experience with us..."
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackRating === 0}
                  className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Feedback
                </button>
              </div>

              {feedbackSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  Thank you for your feedback!
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
