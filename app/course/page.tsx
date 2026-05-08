import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PlayCircle } from "lucide-react";

const MOCK_VIDEO_COURSES = [
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

export default function CoursePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Courses</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Explore short learning modules to improve your financial decision-making.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MOCK_VIDEO_COURSES.map((course) => (
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
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
                  >
                    View Course
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </AppLayout>
    </ProtectedRoute>
  );
}
