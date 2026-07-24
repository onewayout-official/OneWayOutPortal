import ExpenseList from "@/components/ExpenseList";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ExpenseList />
      </AppLayout>
    </ProtectedRoute>
  );
}

