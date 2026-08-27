import AppLayout from "@/components/AppLayout";
import UserDetailPanel from "@/components/UserDetailPanel";
import ProtectedRoute from "@/components/ProtectedRoute";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <AppLayout>
        <UserDetailPanel userId={id} />
      </AppLayout>
    </ProtectedRoute>
  );
}
