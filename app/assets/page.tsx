import AssetView from "@/components/AssetView";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AssetsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AssetView />
      </AppLayout>
    </ProtectedRoute>
  );
}
