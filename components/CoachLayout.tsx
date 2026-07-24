"use client";

import CoachNavigation from "@/components/CoachNavigation";
import DashboardTopBar from "@/components/DashboardTopBar";

interface CoachLayoutProps {
  children: React.ReactNode;
}

export default function CoachLayout({ children }: CoachLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col md:flex-row">
        <aside className="md:fixed md:top-0 md:left-0 md:h-screen md:w-64 md:z-40 overflow-y-auto nav-scrollbar">
          <CoachNavigation />
        </aside>
        <main className="flex-1 min-w-0 p-4 md:p-8 pb-20 md:pb-8 md:ml-64 min-h-screen">
          <DashboardTopBar />
          {children}
        </main>
      </div>
    </div>
  );
}
