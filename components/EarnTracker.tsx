"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Coins, CheckCircle, Lock } from "lucide-react";
import {
  EARN_SCREEN_TASKS,
  isTaskCompleted,
  formatPointsDisplay,
  VIDEO_QUIZ_DAILY_CAP,
  type GamificationTaskId,
} from "@/lib/gamification/config";
import { rewards } from "@/lib/gamification/rewards";
import type { GamificationState } from "@/types";
import SpinWheel from "@/components/SpinWheel";

const NAVIGATE_ONLY: GamificationTaskId[] = [
  "daily-mood",
  "expense-log",
  "monthly-budget-update",
];

export default function EarnTracker() {
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completingId, setCompletingId] = useState<GamificationTaskId | null>(null);
  const [showClaimed, setShowClaimed] = useState<GamificationTaskId | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
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
      return;
    }
    if (task.id === "register-webinar") {
      setIsWebinarModalOpen(true);
      setWebinarSuccess(false);
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
          Redeem on Spend →
        </Link>
      </div>

      <SpinWheel state={gamification} onStateChange={handleGamificationUpdate} />

      {taskError && (
        <p className="text-sm text-red-600 dark:text-red-400">{taskError}</p>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {EARN_SCREEN_TASKS.map((task) => {
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
                {task.href && (
                  <Link
                    href={task.href}
                    className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Go to task â†’
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
