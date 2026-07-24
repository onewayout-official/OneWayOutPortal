import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function My1PlanPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">
            Coming soon
          </p>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
