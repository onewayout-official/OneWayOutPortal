import AppLayout from "@/components/AppLayout";
import UsersPanel from "@/components/UsersPanel";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <UsersPanel />
      </AppLayout>
    </ProtectedRoute>
  );
}
