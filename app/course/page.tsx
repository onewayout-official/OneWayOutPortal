import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import CourseList from "@/components/CourseList";

export default function CoursePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <CourseList />
      </AppLayout>
    </ProtectedRoute>
  );
}
