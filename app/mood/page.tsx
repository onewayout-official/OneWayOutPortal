import MoodTracker from "@/components/MoodTracker";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function MoodPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <MoodTracker />
      </AppLayout>
    </ProtectedRoute>
  );
}
