import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function My1PlanPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div />
      </AppLayout>
    </ProtectedRoute>
  );
}
