"use client";

import { Chrome } from "lucide-react";

export default function GoogleLoginButton() {
  const handleClick = () => {
    // Placeholder - functionality will be added later
    alert("Google login will be available soon!");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm cursor-pointer"
    >
      <Chrome className="h-5 w-5" />
      Continue with Google
    </button>
  );
}

