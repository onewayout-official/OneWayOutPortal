import AppLayout from "@/components/AppLayout";
import AdminUsersPanel from "@/components/AdminUsersPanel";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AdminUsersPanel />
      </AppLayout>
    </ProtectedRoute>
  );
}
