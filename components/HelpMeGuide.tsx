"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { storage } from "@/lib/storage";
import { HelpCircle, Lightbulb, MessageCircle, Calendar, Phone, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HelpMeGuide() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const userProfile = await storage.getProfile();
    setProfile(userProfile);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const monthlyIncome = profile?.monthlyIncome || 0;
  const totalDebt = profile?.debts || 0;
  const capital = profile?.capital || 0;
  const netWorth = capital - totalDebt;

  // Generate personalized recommendations
  /*const recommendations = [];

  if (!profile?.onboardingCompleted) {
    recommendations.push({
      title: "Complete Your Onboarding",
      description: "Finish setting up your profile to get personalized insights and recommendations.",
      action: "Complete Setup",
      href: "/onboarding",
      priority: "high",
    });
  }

  if (totalDebt > 0 && totalDebt > monthlyIncome * 3) {
    recommendations.push({
      title: "Focus on Debt Reduction",
      description: "Your debt is significant compared to your income. Consider creating a debt payoff plan.",
      action: "Review Debts",
      href: "/debts",
      priority: "high",
    });
  }

  if (netWorth < 0) {
    recommendations.push({
      title: "Improve Your Net Worth",
      description: "Your liabilities exceed your assets. Focus on building assets and reducing debt.",
      action: "View Assets",
      href: "/assets",
      priority: "high",
    });
  }

  if (monthlyIncome > 0 && capital < monthlyIncome * 6) {
    recommendations.push({
      title: "Build Emergency Fund",
      description: "Aim to save 6 months of expenses as an emergency fund for financial security.",
      action: "Track Savings",
      href: "/assets",
      priority: "medium",
    });
  }

  if (profile?.mood === "😔") {
    recommendations.push({
      title: "Track Your Mood",
      description: "Your mood indicates you might be feeling stressed. Remember, progress takes time.",
      action: "Update Mood",
      href: "/mood",
      priority: "medium",
    });
  }

  // Default recommendations if none match
  if (recommendations.length === 0) {
    recommendations.push(
      {
        title: "Track Your Expenses",
        description: "Start tracking your daily expenses to understand your spending patterns.",
        action: "View Expenses",
        href: "/expenses",
        priority: "medium",
      },
      {
        title: "Set Income Goals",
        description: "Set goals for increasing your income and track your progress.",
        action: "Set Goals",
        href: "/earn",
        priority: "low",
      },
      {
        title: "Review Your Budget",
        description: "Check your budget status and make sure you're staying on track.",
        action: "View Budget",
        href: "/budget",
        priority: "medium",
      }
    );
  }*/

  const quickActions = [
    {
      icon: MessageCircle,
      label: "Chat with someone",
      bg: "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/50",
      iconBg: "bg-blue-200/80 dark:bg-blue-700/50",
      color: "text-blue-700 dark:text-blue-300",
    },
    {
      icon: Calendar,
      label: "Book an appointment",
      bg: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800/50",
      iconBg: "bg-emerald-200/80 dark:bg-emerald-700/50",
      color: "text-emerald-700 dark:text-emerald-300",
    },
    {
      icon: Phone,
      label: "Call me back",
      bg: "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/50",
      iconBg: "bg-amber-200/80 dark:bg-amber-700/50",
      color: "text-amber-700 dark:text-amber-300",
    },
  ];

  const motivationalMessages = [
    "Every step you take toward your goals counts. You're making progress.",
    "Small, consistent actions lead to big changes. Keep going.",
    "Your future self will thank you for the choices you make today.",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <HelpCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help Me</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Get guidance on your next steps</p>
        </div>
      </div>

      {/* Quick Actions - Top */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              className={`flex items-center gap-3 p-4 rounded-xl border-2 ${action.bg} transition-all`}
            >
              <div className={`p-2.5 rounded-full ${action.iconBg} ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className={`text-sm font-medium ${action.color} text-left`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Positive & motivational messages */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">A little motivation</h2>
        <div className="space-y-3">
          {motivationalMessages.map((msg, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3"
            >
              <p className="text-gray-800 dark:text-gray-200 text-sm md:text-base">"{msg}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Personalized Recommendations */}
      {/*<div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personalized Recommendations</h2>
        </div>
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-5 transition-all hover:shadow-md ${rec.priority === "high"
              ? "border-red-200 dark:border-red-800"
              : rec.priority === "medium"
                ? "border-amber-200 dark:border-amber-800"
                : "border-gray-200 dark:border-gray-700"
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h3>
                  {rec.priority === "high" && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                      High Priority
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{rec.description}</p>
                <Link
                  href={rec.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {rec.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>*/}

      {/* Financial Summary */}
      {/*<div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Financial Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly Income</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Assets</p>
            <p className="text-lg font-bold text-green-600">
              ${capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Debts</p>
            <p className="text-lg font-bold text-red-600">
              ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Worth</p>
            <p className={`text-lg font-bold ${netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>*/}
    </div>
  );
}
