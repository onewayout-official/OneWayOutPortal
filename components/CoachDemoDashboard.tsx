"use client";

import CoachDashboardContent from "@/components/CoachDashboardContent";
import { DEMO_COACH_APPOINTMENTS, DEMO_COACH_NAME } from "@/lib/coachDemoData";

export default function CoachDemoDashboard() {
  return (
    <CoachDashboardContent
      appointments={DEMO_COACH_APPOINTMENTS}
      coachName={DEMO_COACH_NAME}
      demoBanner="Demo mode — sample coach portal data for preview only. Only visible to the coaches admin account."
    />
  );
}
