import AppLayout from "@/components/AppLayout";
import CreateUserPanel from "@/components/CreateUserPanel";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CreateUserPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CreateUserPanel />
      </AppLayout>
    </ProtectedRoute>
  );
}
