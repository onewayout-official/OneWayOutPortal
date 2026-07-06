"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import DashboardTopBar from "@/components/DashboardTopBar";
import OnboardingPortalGate from "@/components/OnboardingPortalGate";
import { useAuth } from "@/contexts/AuthContext";
import RespondIoWidget from "@/components/RespondIoWidget";


interface AppLayoutProps {

  children: React.ReactNode;

}


export default function AppLayout({ children }: AppLayoutProps) {

  const { isCounselor, isLoading } = useAuth();

  const router = useRouter();



  useEffect(() => {

    if (!isLoading && isCounselor) {

      router.replace("/coach");

    }

  }, [isCounselor, isLoading, router]);



  if (isLoading || isCounselor) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-600 dark:text-gray-400">Loading...</p>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      <div className="flex flex-col md:flex-row">

        <aside className="md:fixed md:top-0 md:left-0 md:h-screen md:w-64 md:z-40 overflow-y-auto nav-scrollbar">

          <Navigation />

        </aside>

        <main className="flex-1 min-w-0 p-4 pb-6 md:p-8 md:ml-64 min-h-screen">

          <DashboardTopBar />

          <OnboardingPortalGate>{children}</OnboardingPortalGate>

        </main>

      </div>

      <RespondIoWidget />

    </div>

  );

}

