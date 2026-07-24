import Consent from "@/components/Consent";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export const metadata = {
  title: "Consent | OneWayOut Financial Adviser",
  description: "Register OneWayOut as your dedicated financial adviser and join the 1-Community Savings scheme.",
};

export default function ConsentPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Consent />
      </AppLayout>
    </ProtectedRoute>
  );
}
