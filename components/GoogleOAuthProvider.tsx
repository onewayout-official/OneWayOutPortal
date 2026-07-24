"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ReactNode } from "react";

// Get Google Client ID from environment variable
// For development, you can set this in .env.local
// NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function GoogleOAuthProviderWrapper({ children }: { children: ReactNode }) {
  // If no client ID is provided, still render children but Google login won't work
  if (!GOOGLE_CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}


