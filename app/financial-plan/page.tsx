import FinancialInsights from "@/components/FinancialInsights";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function FinancialPlanPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <FinancialInsights />
      </AppLayout>
    </ProtectedRoute>
  );
}
