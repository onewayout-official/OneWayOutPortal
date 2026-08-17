import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import GoogleTagManager from "@/components/GoogleTagManager";
import GtmRouteTracker from "@/components/GtmRouteTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "One Way Out Portal",
  description: "Manage your expenses, debts, and achieve financial freedom with One Way Out Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleTagManager />
        <Suspense fallback={null}>
          <GtmRouteTracker />
        </Suspense>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
