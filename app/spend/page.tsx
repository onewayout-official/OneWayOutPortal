import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import SpendMaintenancePreview from "@/components/SpendMaintenancePreview";

export default function SpendPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div
            className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-center shadow-sm dark:border-amber-700 dark:bg-amber-950/40"
            role="status"
            aria-live="polite"
          >
            <p className="text-lg font-semibold text-amber-950 dark:text-amber-100">
              Under Maintenance: Live from 2 September 2026
            </p>
          </div>

          <div
            className="pointer-events-none select-none opacity-45 grayscale"
            aria-hidden
            inert
          >
            <SpendMaintenancePreview />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
