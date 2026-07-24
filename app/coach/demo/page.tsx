import CoachLayout from "@/components/CoachLayout";
import CoachDemoDashboard from "@/components/CoachDemoDashboard";
import CoachDemoProtectedRoute from "@/components/CoachDemoProtectedRoute";

export default function CoachDemoPage() {
  return (
    <CoachDemoProtectedRoute>
      <CoachLayout>
        <CoachDemoDashboard />
      </CoachLayout>
    </CoachDemoProtectedRoute>
  );
}
