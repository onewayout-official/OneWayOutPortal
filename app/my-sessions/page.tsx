import AppLayout from "@/components/AppLayout";
import MyCoachSessions from "@/components/MyCoachSessions";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function MySessionsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <MyCoachSessions />
      </AppLayout>
    </ProtectedRoute>
  );
}
