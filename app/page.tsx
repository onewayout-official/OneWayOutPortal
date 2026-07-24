import Dashboard from "@/components/Dashboard";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import OnboardingCheck from "@/components/OnboardingCheck";

export default function Home() {
  return (
    <ProtectedRoute>
      <OnboardingCheck>
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </OnboardingCheck>
    </ProtectedRoute>
  );
}
