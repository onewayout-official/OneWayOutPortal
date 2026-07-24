import HelpMeGuide from "@/components/HelpMeGuide";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function HelpMePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <HelpMeGuide />
      </AppLayout>
    </ProtectedRoute>
  );
}
