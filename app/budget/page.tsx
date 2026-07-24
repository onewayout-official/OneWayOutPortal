import BudgetManager from "@/components/BudgetManager";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function BudgetPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <BudgetManager />
      </AppLayout>
    </ProtectedRoute>
  );
}
