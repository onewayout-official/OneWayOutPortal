import CoachLayout from "@/components/CoachLayout";
import CoachDashboard from "@/components/CoachDashboard";
import CoachProtectedRoute from "@/components/CoachProtectedRoute";

export default function CoachPage() {
  return (
    <CoachProtectedRoute>
      <CoachLayout>
        <CoachDashboard />
      </CoachLayout>
    </CoachProtectedRoute>
  );
}
