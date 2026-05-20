"use client";

import { useState } from "react";
import { HelpCircle, MessageCircle, Calendar, Phone, ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { MOCK_COUNSELORS } from "@/lib/mockCounselors";

type QuickAction =
  | {
      type: "chat";
      icon: LucideIcon;
      label: string;
      bg: string;
      iconBg: string;
      color: string;
    }
  | {
      type: "link";
      icon: LucideIcon;
      label: string;
      href: string;
      bg: string;
      iconBg: string;
      color: string;
    };

export default function HelpMeGuide() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const quickActions: QuickAction[] = [
    {
      icon: MessageCircle,
      label: "Chat with someone",
      type: "chat",
      bg: "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/50",
      iconBg: "bg-blue-200/80 dark:bg-blue-700/50",
      color: "text-blue-700 dark:text-blue-300",
    },
    {
      icon: Calendar,
      label: "Book an appointment",
      type: "link",
      href: `/help-me/counselors/${MOCK_COUNSELORS[0].id}`,
      bg: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800/50",
      iconBg: "bg-emerald-200/80 dark:bg-emerald-700/50",
      color: "text-emerald-700 dark:text-emerald-300",
    },
    {
      icon: Phone,
      label: "Call me back",
      type: "link",
      href: `/help-me/counselors/${MOCK_COUNSELORS[1].id}`,
      bg: "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/50",
      iconBg: "bg-amber-200/80 dark:bg-amber-700/50",
      color: "text-amber-700 dark:text-amber-300",
    },
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

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Book Free Sessions with our Life Coaches/Counsellors below</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {MOCK_COUNSELORS.length} counselors
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {MOCK_COUNSELORS.map((counselor) => (
            <article
              key={counselor.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-700/20"
            >
              <div className="flex items-start gap-3">
                <img
                  src={counselor.image}
                  alt={counselor.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{counselor.name}</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Life Coach/Counsellor</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {counselor.experienceYears} yrs experience
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">{counselor.specialty}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{counselor.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/help-me/counselors/${counselor.id}?action=book`}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Book appointment
                </Link>
                <Link
                  href={`/help-me/counselors/${counselor.id}`}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-200 dark:border-blue-700 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  View details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            action.type === "chat" ? (
              <button
                key={idx}
                type="button"
                onClick={() => setIsChatOpen(true)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 ${action.bg} transition-all text-left`}
              >
                <div className={`p-2.5 rounded-full ${action.iconBg} ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className={`text-sm font-medium ${action.color} text-left`}>
                  {action.label}
                </span>
              </button>
            ) : (
              <Link
                key={idx}
                href={action.href}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 ${action.bg} transition-all`}
              >
                <div className={`p-2.5 rounded-full ${action.iconBg} ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className={`text-sm font-medium ${action.color} text-left`}>
                  {action.label}
                </span>
              </Link>
            )
          ))}
        </div>
      </div>

      {isChatOpen ? (
        <div className="fixed bottom-4 right-4 z-50 w-[350px] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between rounded-t-xl bg-blue-600 px-3 py-2 text-white">
            <h3 className="text-sm font-semibold">Counselor chat</h3>
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              className="rounded px-2 py-0.5 text-xs hover:bg-blue-700"
            >
              Minimize
            </button>
          </div>
          <div className="h-64 space-y-2 overflow-y-auto bg-gray-50 p-3 dark:bg-gray-900/30">
            <div className="max-w-[85%] rounded-lg bg-blue-600 px-3 py-2 text-xs text-white">
              Hi, I need help planning my debt payoff.
            </div>
            <div className="ml-auto max-w-[85%] rounded-lg bg-white px-3 py-2 text-xs text-gray-700 shadow dark:bg-gray-700 dark:text-gray-200">
              You are in the right place. I can guide you step by step.
            </div>
          </div>
          <div className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </button>
      )}
    </div>
  );
}
