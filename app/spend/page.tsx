import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

function SpendMaintenancePlaceholder() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spend</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Redeem your earned points</p>
        </div>
      </div>
      <div className="h-32 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600" />
      <div className="h-56 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
      <div className="h-40 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
    </div>
  );
}

export default function SpendPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="relative min-h-[60vh]">
          <div
            className="pointer-events-none select-none opacity-40 grayscale"
            aria-hidden
            inert
          >
            <SpendMaintenancePlaceholder />
          </div>
          <div
            className="absolute inset-0 z-20 bg-gray-50/80 dark:bg-gray-900/75 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
          >
            <div className="sticky top-32 flex justify-center p-4">
              <div className="max-w-md w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 px-6 py-8 shadow-lg text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Under Maintenance: Live from 2 September 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
