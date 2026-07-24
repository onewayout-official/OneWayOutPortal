import CoachLayout from "@/components/CoachLayout";
import CoachProfileEditor from "@/components/CoachProfileEditor";
import CoachProtectedRoute from "@/components/CoachProtectedRoute";

export default function CoachProfilePage() {
  return (
    <CoachProtectedRoute>
      <CoachLayout>
        <CoachProfileEditor />
      </CoachLayout>
    </CoachProtectedRoute>
  );
}
