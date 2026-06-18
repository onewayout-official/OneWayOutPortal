import AppLayout from "@/components/AppLayout";
import AdminCoachesPanel from "@/components/AdminCoachesPanel";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AdminCoachesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AdminCoachesPanel />
      </AppLayout>
    </ProtectedRoute>
  );
}
