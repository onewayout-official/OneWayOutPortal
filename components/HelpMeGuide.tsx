"use client";

import { useState } from "react";
import { HelpCircle, MessageCircle, AlertTriangle, ArrowRight, Phone, MessageSquare, Clock, PhoneCall } from "lucide-react";
import Link from "next/link";
import { MOCK_COUNSELORS } from "@/lib/mockCounselors";

export default function HelpMeGuide() {
  const [isChatOpen, setIsChatOpen] = useState(false);

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

      {/* Crisis Disclaimer */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-800/40">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
            Feeling Extremely Overwhelmed and Helpless
          </h2>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
          Please note that we only offer life coaching and counselling session. Our coaches are not qualified psychologist and are not allowed to offer psychologically counselling session. Should you require assistance from duly qualified psychologist – please see a list of help lines below.
        </p>
      </div>

      {/* Help Lines */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="bg-teal-600 dark:bg-teal-700 px-6 py-4 flex items-center gap-3">
          <PhoneCall className="h-5 w-5 text-white" />
          <h2 className="text-base font-semibold text-white tracking-wide uppercase">Help Lines</h2>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

          {/* Column 1 — 24-Hour Emergency */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-900/30 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
                <Clock className="h-3 w-3" />
                24-Hour Toll-Free Emergency
              </span>
            </div>
            {[
              { name: "Suicide Crisis Helpline", number: "0800 567 567" },
              { name: "Dept. of Social Development Substance Abuse Helpline", number: "0800 12 13 14", sms: "32312" },
              { name: "Cipla Mental Health Helpline", number: "0800 456 789", sms: "31393" },
              { name: "NPower SA Helpline", number: "0800 515 515", sms: "43010" },
              { name: "Healthcare Workers Care Network Helpline", number: "0800 21 21 21", sms: "43001" },
              { name: "UFS #Fair Kitchens Chefs Helpline", number: "0800 006 333" },
            ].map((item) => (
              <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-red-100 dark:bg-red-800/30">
                  <Phone className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">{item.name}</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400 mt-0.5">{item.number}</p>
                  {item.sms && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">SMS: {item.sms}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Column 2 — 8AM-8PM Business Hours */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-900/30 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <Clock className="h-3 w-3" />
                8AM – 8PM Toll-Free
              </span>
            </div>
            {[
              { name: "Dr Reddy's Mental Health Helpline", number: "0800 21 22 23" },
              { name: "Adcock Ingram Depression & Anxiety Helpline", number: "0800 70 80 90" },
              { name: "ADHD Helpline", number: "0500 55 44 33" },
              { name: "Pharma Dynamics Police & Trauma Helpline", number: "0800 20 50 26" },
            ].map((item) => (
              <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30">
                <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-teal-100 dark:bg-teal-800/30">
                  <Phone className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">{item.name}</p>
                  <p className="text-sm font-bold text-teal-700 dark:text-teal-400 mt-0.5">{item.number}</p>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-4 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-900/30 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                8AM – 8PM SADAG Office
              </span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30">
              <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-teal-100 dark:bg-teal-800/30">
                <Phone className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">SADAG</p>
                <p className="text-sm font-bold text-teal-700 dark:text-teal-400 mt-0.5">011 234 4837</p>
              </div>
            </div>
          </div>

          {/* Column 3 — Additional Help Lines */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                Additional Help Lines
              </span>
            </div>
            {[
              { name: "Akeso Crisis Helpline", number: "0861 435 787" },
              { name: "ChaiFM Helpline", number: "0800 24 24 36" },
              { name: "ChildLine South Africa", number: "116 (free)" },
              { name: "Lifeline", number: "0861 322 322" },
              { name: "Tears Foundation", number: "0800 083 277" },
              { name: "Careline", number: "082 787 6452 / 082 822 7981" },
            ].map((item) => (
              <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-blue-100 dark:bg-blue-800/30">
                  <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">{item.name}</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mt-0.5">{item.number}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Column 3 — WhatsApp Numbers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300">
                <MessageSquare className="h-3 w-3" />
                WhatsApp Numbers (8AM – 5PM)
              </span>
            </div>
            {[
              { name: "Cipla Mental Health", number: "076 882 2775" },
              { name: "Maybelline BraveTogether", number: "087 163 2030" },
              { name: "Ke Moja Substance Abuse", number: "087 163 2025" },
              { name: "Have Hope Chat Line", number: "087 163 2050" },
            ].map((item) => (
              <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30">
                <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-green-100 dark:bg-green-800/30">
                  <MessageSquare className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">{item.name}</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-0.5">{item.number}</p>
                </div>
              </div>
            ))}
          </div>

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
