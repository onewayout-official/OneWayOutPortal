"use client";

import Navigation from "@/components/Navigation";
import OnboardingPortalGate from "@/components/OnboardingPortalGate";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col md:flex-row">
        <aside className="md:fixed md:top-0 md:left-0 md:h-screen md:w-64 md:z-40 md:border-r md:border-gray-200 md:dark:border-gray-700 md:bg-white md:dark:bg-gray-900 overflow-y-auto">
          <Navigation />
        </aside>
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 md:ml-64 min-h-screen">
          <OnboardingPortalGate>{children}</OnboardingPortalGate>
        </main>
      </div>
    </div>
  );
}
