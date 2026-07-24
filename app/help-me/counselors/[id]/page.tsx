import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import CounselorDetail from "@/components/CounselorDetail";

export default async function CounselorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <AppLayout>
        <CounselorDetail counselorId={id} />
      </AppLayout>
    </ProtectedRoute>
  );
}
