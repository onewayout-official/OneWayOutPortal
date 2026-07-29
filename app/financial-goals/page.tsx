import type { Metadata } from "next";
import FinancialGoals from "@/components/FinancialGoals";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export const metadata: Metadata = {
  title: "Financial Goals | OneWayOut",
  description:
    "Complete your financial goals to see where you stand and what it takes to close the gap.",
};

export default function FinancialGoalsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <FinancialGoals />
      </AppLayout>
    </ProtectedRoute>
  );
}
