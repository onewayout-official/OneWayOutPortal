import DebtList from "@/components/DebtList";
import LiabilityView from "@/components/LiabilityView";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DebtsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-10">
          <DebtList />
          <LiabilityView />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
