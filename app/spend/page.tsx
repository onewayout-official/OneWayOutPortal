import SpendTracker from "@/components/SpendTracker";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SpendPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <SpendTracker />
      </AppLayout>
    </ProtectedRoute>
  );
}
