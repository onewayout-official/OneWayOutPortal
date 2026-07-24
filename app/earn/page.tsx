import EarnTracker from "@/components/EarnTracker";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function EarnPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <EarnTracker />
      </AppLayout>
    </ProtectedRoute>
  );
}
