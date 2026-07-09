"use client";

import { useEffect, useState } from "react";
import { PlayCircle, CheckCircle } from "lucide-react";
import { rewards } from "@/lib/gamification/rewards";
import { notifyRewardPointsUpdated } from "@/lib/gamification/rewardPoints";
import { storage } from "@/lib/storage";
import { VIDEO_QUIZ_DAILY_CAP } from "@/lib/gamification/config";

interface VideoCourse {
  id: string;
  title: string;
  description: string;
  lessons: number;
  duration: string;
  level: string;
}

const MOCK_VIDEO_COURSES: VideoCourse[] = [
  {
    id: "budgeting-basics",
    title: "Budgeting Basics for Beginners",
    description:
      "Learn how to build a realistic monthly budget, track your spending patterns, and make simple adjustments that help you stay in control of your money.",
    lessons: 12,
    duration: "1h 45m",
    level: "Beginner",
  },
  {
    id: "debt-payoff-plan",
    title: "Build a Debt Payoff Plan",
    description:
      "Understand practical debt reduction methods, prioritize repayments effectively, and create a step-by-step plan to become debt free with less stress.",
    lessons: 10,
    duration: "1h 20m",
    level: "Beginner",
  },
  {
    id: "smart-saving",
    title: "Smart Saving Habits",
    description:
      "Discover habit-based saving strategies that fit everyday life, from setting realistic targets to automating progress and staying motivated over time.",
    lessons: 8,
    duration: "58m",
    level: "Beginner",
  },
  {
    id: "investing-intro",
    title: "Intro to Investing with Confidence",
    description:
      "Get a clear foundation in investing basics, risk awareness, and long-term thinking so you can start building wealth confidently and consistently.",
    lessons: 14,
    duration: "2h 05m",
    level: "Intermediate",
  },
  {
    id: "retirement-roadmap",
    title: "Retirement Roadmap",
    description:
      "Plan for retirement with practical milestones, contribution strategies, and goal tracking approaches tailored to your current life and income stage.",
    lessons: 9,
    duration: "1h 30m",
    level: "Intermediate",
  },
  {
    id: "tax-planning-fundamentals",
    title: "Tax Planning Fundamentals",
    description:
      "Understand key tax planning principles, avoid common filing mistakes, and make better year-round financial decisions that support long-term outcomes.",
    lessons: 11,
    duration: "1h 35m",
    level: "Intermediate",
  },
];

export default function CourseList() {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [claimsToday, setClaimsToday] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await rewards.getGamificationState();
      if (cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      const prefix = `video-quiz-${today}-`;
      setClaimsToday(state.completedTaskKeys.filter((k) => k.startsWith(prefix)).length);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const capReached = claimsToday >= VIDEO_QUIZ_DAILY_CAP;

  const handleClaim = async (course: VideoCourse) => {
    setError(null);
    setMessage(null);
    if (capReached || claimingId) return;

    setClaimingId(course.id);
    const result = await rewards.awardTask("video-quiz", {
      metadata: { content_id: course.id },
    });
    await storage.logEarnActivity();
    setClaimingId(null);

    if (!result.ok) {
      setError(
        result.error === "daily_cap_reached"
          ? `You've reached the daily limit of ${VIDEO_QUIZ_DAILY_CAP} quizzes.`
          : "Could not claim points. Try again."
      );
      if (result.error === "daily_cap_reached") setClaimsToday(VIDEO_QUIZ_DAILY_CAP);
      return;
    }

    setClaimedIds((prev) => new Set(prev).add(course.id));
    setClaimsToday((n) => n + 1);
    setMessage(`+${result.pointsAwarded} points earned!`);
    notifyRewardPointsUpdated();
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Courses</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Explore short learning modules to improve your financial decision-making. Finish a
          module&apos;s quiz to earn 100 points ({VIDEO_QUIZ_DAILY_CAP} per day).
        </p>
      </div>

      {(message || error) && (
        <p
          className={`text-sm font-medium ${
            error ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
          }`}
        >
          {error ?? message}
        </p>
      )}
      {capReached && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You&apos;ve claimed today&apos;s {VIDEO_QUIZ_DAILY_CAP} quizzes. Come back tomorrow for more.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MOCK_VIDEO_COURSES.map((course) => {
          const claimed = claimedIds.has(course.id);
          const isClaiming = claimingId === course.id;
          return (
            <article
              key={course.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-800/40">
                <PlayCircle className="h-12 w-12 text-blue-700 dark:text-blue-300" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/80 dark:text-gray-200">
                  {course.level}
                </span>
              </div>

              <div className="space-y-3 p-4">
                <h2 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                  {course.title}
                </h2>
                <p className="line-clamp-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {course.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{course.lessons} lessons</span>
                  <span>{course.duration}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleClaim(course)}
                  disabled={claimed || isClaiming || capReached}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                    claimed
                      ? "border border-green-200 text-green-700 dark:border-green-700 dark:text-green-300"
                      : "border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
                  }`}
                >
                  {claimed ? (
                    <>
                      <CheckCircle className="h-4 w-4" /> Completed
                    </>
                  ) : isClaiming ? (
                    "Claiming..."
                  ) : (
                    "Complete & Claim 100 pts"
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
