import LiabilityView from "@/components/LiabilityView";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function LiabilitiesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <LiabilityView />
      </AppLayout>
    </ProtectedRoute>
  );
}
