"use client";

import { useState, useEffect } from "react";
import { UserProfile, DailyMood } from "@/types";
import { storage } from "@/lib/storage";
import { Smile, Calendar, TrendingUp } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const moods: Array<{ emoji: "😊" | "😐" | "😔"; label: string; description: string; score: number; color: string }> = [
  { emoji: "😊", label: "Great",       description: "Feeling positive and optimistic",  score: 3, color: "#22c55e" },
  { emoji: "😐", label: "Okay",        description: "Doing fine, steady progress",       score: 2, color: "#f59e0b" },
  { emoji: "😔", label: "Struggling",  description: "Finding it challenging",            score: 1, color: "#ef4444" },
];

const emojiToScore = (emoji: string): number => {
  const found = moods.find((m) => m.emoji === emoji);
  return found?.score ?? 2;
};

const scoreToLabel = (score: number): string => {
  if (score >= 2.6) return "Great 😊";
  if (score >= 1.6) return "Okay 😐";
  return "Struggling 😔";
};

const scoreToColor = (score: number): string => {
  if (score >= 2.6) return "#22c55e";
  if (score >= 1.6) return "#f59e0b";
  return "#ef4444";
};

/** Build the last N days as chart data, filling missing dates with null */
function buildChartData(moodHistory: DailyMood[], days = 30) {
  const today = new Date();
  const moodMap: Record<string, number> = {};
  for (const entry of moodHistory) {
    moodMap[entry.date] = emojiToScore(entry.mood);
  }

  return Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const key = format(date, "yyyy-MM-dd");
    return {
      date: key,
      label: format(date, "MMM d"),
      score: moodMap[key] ?? null,
    };
  });
}

// Custom dot that shows the emoji for each data point
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.score === null || cx === undefined || cy === undefined) return null;
  const emoji = moods.find((m) => m.score === payload.score)?.emoji ?? "😐";
  return (
    <text x={cx} y={cy + 6} textAnchor="middle" fontSize={16} style={{ userSelect: "none" }}>
      {emoji}
    </text>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0 || payload[0].value === null) return null;
  const score: number = payload[0].value;
  const emoji = moods.find((m) => m.score === score)?.emoji ?? "😐";
  const moodLabel = moods.find((m) => m.score === score)?.label ?? "";
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{moodLabel}</span>
      </div>
    </div>
  );
};

export default function MoodTracker() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedMood, setSelectedMood] = useState<"😊" | "😐" | "😔" | null>(null);
  const [moodHistory, setMoodHistory] = useState<DailyMood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [userProfile, dailyMoods] = await Promise.all([
      storage.getProfile(),
      storage.getDailyMoods(),
    ]);
    setProfile(userProfile);
    setMoodHistory(dailyMoods);

    // Pre-select today's mood if already logged
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const todayEntry = dailyMoods.find((m) => m.date === todayKey);
    if (todayEntry) setSelectedMood(todayEntry.mood);

    setIsLoading(false);
  };

  const handleMoodSelect = async (mood: "😊" | "😐" | "😔") => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const alreadyLogged = moodHistory.some((m) => m.date === todayKey);
    if (isSaving || alreadyLogged) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Persist daily row first (history + chart); does not depend on profile
      await storage.saveDailyMood({ date: todayKey, mood });

      let nextProfile = profile;
      if (!nextProfile) {
        nextProfile = await storage.getProfile();
      }
      if (nextProfile) {
        const updatedProfile = { ...nextProfile, mood };
        await storage.saveProfile(updatedProfile);
        setProfile(updatedProfile);
      }

      setSelectedMood(mood);
      const dailyMoods = await storage.getDailyMoods();
      setMoodHistory(dailyMoods);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your mood. Please try again.";
      setSaveError(message);
      setSelectedMood(moodHistory.find((m) => m.date === todayKey)?.mood ?? null);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-yellow-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading mood tracker...</p>
        </div>
      </div>
    );
  }

  const chartData = buildChartData(moodHistory, chartDays);
  const hasHistoryData = moodHistory.length > 0;

  // Compute streak: consecutive days (including today) with a mood logged
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = format(subDays(today, i), "yyyy-MM-dd");
    if (moodHistory.some((m) => m.date === key)) streak++;
    else break;
  }

  const todayKey = format(today, "yyyy-MM-dd");
  const todayMood = moodHistory.find((m) => m.date === todayKey);
  const moodLockedForToday = Boolean(todayMood);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <Smile className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mood Tracker</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">How are you feeling today?</p>
        </div>
      </div>

      {/* Streak + Today's mood summary */}
      {hasHistoryData && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <div className="text-3xl">🔥</div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{streak} <span className="text-base font-medium">day{streak !== 1 ? "s" : ""}</span></p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <div className="text-3xl">{todayMood?.mood ?? "—"}</div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Today</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {todayMood ? moods.find((m) => m.emoji === todayMood.mood)?.label : "Not logged yet"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mood Selection */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {moodLockedForToday ? "Today's mood" : "Log today's mood"}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {moodLockedForToday
            ? "You've already saved your mood for today. You can log again tomorrow."
            : "Choose one mood for today — you can only save once per day."}
        </p>
        {saveError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
            {saveError}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          {moods.map((mood) => {
            const isActive = selectedMood === mood.emoji;
            const disabled = isSaving || moodLockedForToday;
            return (
              <button
                key={mood.emoji}
                type="button"
                onClick={() => handleMoodSelect(mood.emoji)}
                disabled={disabled}
                className={`p-5 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                  isActive
                    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 scale-105 shadow-md"
                    : "border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700 hover:scale-102"
                } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="text-4xl">{mood.emoji}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{mood.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight">{mood.description}</span>
              </button>
            );
          })}
        </div>
        {isSaving && (
          <p className="mt-3 text-center text-sm text-yellow-600 dark:text-yellow-400 animate-pulse">Saving mood...</p>
        )}
      </div>

      {/* Mood History Line Chart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mood Trend</h2>
          </div>
          {/* Day range selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  chartDays === d
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {!hasHistoryData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-5xl mb-3">📈</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Log your mood each day to start seeing your trend here.
            </p>
          </div>
        ) : (
          <>
            {/* Y-axis legend */}
            <div className="flex gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>3 = Great</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>2 = Okay</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>1 = Struggling</span>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  interval={chartDays === 7 ? 0 : chartDays === 14 ? 1 : 4}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0.5, 3.5]}
                  ticks={[1, 2, 3]}
                  tickFormatter={scoreToLabel}
                  tick={{ fontSize: 9, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Reference bands */}
                <ReferenceLine y={2.6} stroke="#bbf7d0" strokeDasharray="4 4" strokeWidth={1} />
                <ReferenceLine y={1.6} stroke="#fde68a" strokeDasharray="4 4" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={{ r: 6, fill: "#f59e0b" }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Recent Mood History List */}
      {moodHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent History</h2>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {moodHistory.slice(0, 14).map((entry, idx) => {
              const score = emojiToScore(entry.mood);
              const color = scoreToColor(score);
              const moodObj = moods.find((m) => m.emoji === entry.mood);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {format(parseISO(entry.date), "EEE, MMM d yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{moodObj?.label}</span>
                    <span className="text-xl">{entry.mood}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Why track mood blurb */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Why Track Your Mood?</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Consistently logging your financial mood helps you spot patterns in your wellbeing journey. 
              Over time, the trend chart reveals how your mindset shifts — letting you celebrate the wins 
              and recognise when you need extra support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
