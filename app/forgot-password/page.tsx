import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import AuthRedirect from "@/components/AuthRedirect";

export default function ForgotPasswordPage() {
  return (
    <AuthRedirect>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <ForgotPasswordForm />
      </div>
    </AuthRedirect>
  );
}
