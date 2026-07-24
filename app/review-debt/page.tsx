import ReviewDebt from "@/components/ReviewDebt";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ReviewDebtPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ReviewDebt />
      </AppLayout>
    </ProtectedRoute>
  );
}
