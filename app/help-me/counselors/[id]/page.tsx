import { notFound } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import CounselorProfile from "@/components/CounselorProfile";
import { MOCK_COUNSELORS } from "@/lib/mockCounselors";

export default async function CounselorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const counselor = MOCK_COUNSELORS.find((item) => item.id === id);

  if (!counselor) {
    notFound();
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <CounselorProfile counselor={counselor} />
      </AppLayout>
    </ProtectedRoute>
  );
}
