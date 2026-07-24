import IncomeView from "@/components/IncomeView";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function IncomePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <IncomeView />
      </AppLayout>
    </ProtectedRoute>
  );
}
