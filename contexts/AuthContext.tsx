"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthSession } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { storage } from "@/lib/storage";
import { isCoachesAdminEmail } from "@/lib/coachesAdmin";
import { getAppUrl } from "@/lib/siteUrl";

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  user: AuthSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleUser: { email: string; name: string; picture?: string }) => Promise<{ success: boolean; error?: string }>;
  // Phone OTP via WhatsApp (metadata optional for signup so new user gets name/email in auth)
  sendOTP: (
    phone: string,
    metadata?: { name?: string; email?: string; firstName?: string; lastName?: string },
    mode?: "login" | "signup"
  ) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (
    phone: string,
    token: string,
    metadata?: { name?: string; email?: string; firstName?: string; lastName?: string },
    mode?: "login" | "signup"
  ) => Promise<{ success: boolean; error?: string; session?: unknown }>;
  loginWithPhone: (phone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCoachesAdmin: boolean;
  isCounselor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthSession(
  session: {
    user: {
      id: string;
      email?: string;
      phone?: string;
      user_metadata?: { phone?: string };
    };
    expires_at?: number;
  } | null
): AuthSession | null {
  if (!session?.user) return null;
  const phone =
    session.user.phone ??
    (typeof session.user.user_metadata?.phone === "string"
      ? session.user.user_metadata.phone
      : undefined);
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    phone,
    expiresAt: session.expires_at ? session.expires_at * 1000 : 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoachesAdmin, setIsCoachesAdmin] = useState(false);
  const [isCounselor, setIsCounselor] = useState(false);
  const router = useRouter();

  const refreshAdminStatus = async (email?: string) => {
    const profile = await storage.getProfile();
    setIsAdmin(profile?.role === "admin");
    setIsCounselor(profile?.role === "counselor");
    setIsCoachesAdmin(isCoachesAdminEmail(email ?? profile?.email));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(toAuthSession(session));
      setIsLoading(false);
      if (session) refreshAdminStatus(session.user.email);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthSession(session));
      if (session) {
        refreshAdminStatus(session.user.email);
      } else {
        setIsAdmin(false);
        setIsCoachesAdmin(false);
        setIsCounselor(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (same folder as package.json), then restart the dev server." };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message === "Invalid login credentials" ? "Invalid email or password." : error.message };
      }
      setUser(toAuthSession(data.session));
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during login.";
      const isNetwork = msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network");
      return {
        success: false,
        error: isNetwork
          ? "Cannot reach Supabase. Check .env.local (NEXT_PUBLIC_SUPABASE_URL and anon key) and that the project is not paused."
          : msg,
      };
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (same folder as package.json), then restart the dev server." };
    }
    try {
      const firstName = payload.firstName.trim();
      const lastName = payload.lastName.trim();
      const email = payload.email.trim();
      const phone = payload.phone.trim();
      const password = payload.password;
      const name = `${firstName} ${lastName}`.trim();

      if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long." };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            first_name: firstName,
            last_name: lastName,
            phone,
          },
        },
      });
      if (error) {
        const isRateLimit = error.message.toLowerCase().includes("too many") || error.message.includes("429");
        return {
          success: false,
          error: isRateLimit
            ? "Too many signup attempts. Please wait a few minutes and try again."
            : error.message,
        };
      }
      if (data.session) {
        setUser(toAuthSession(data.session));
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during registration.";
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("too many");
      const isNetwork = msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network");
      return {
        success: false,
        error: isRateLimit
          ? "Too many signup attempts. Please wait a few minutes and try again."
          : isNetwork
            ? "Cannot reach Supabase. Check .env.local and that your Supabase project is not paused."
            : msg,
      };
    }
  };

  const loginWithGoogle = async (_googleUser: { email: string; name: string; picture?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: "An error occurred during Google login." };
    }
  };

  const sendOTP = async (
    phone: string,
    metadata?: { name?: string; email?: string; firstName?: string; lastName?: string },
    mode: "login" | "signup" = "login"
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (same folder as package.json), then restart the dev server." };
    }
    try {
      const response = await fetch("/api/auth/whatsapp-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, metadata, mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error ?? "Failed to send OTP." };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while sending OTP.";
      return { success: false, error: msg };
    }
  };

  const verifyOTP = async (
    phone: string,
    token: string,
    metadata?: { name?: string; email?: string; firstName?: string; lastName?: string },
    mode: "login" | "signup" = "login"
  ): Promise<{ success: boolean; error?: string; session?: unknown }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (same folder as package.json), then restart the dev server." };
    }
    try {
      const response = await fetch("/api/auth/whatsapp-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: token, metadata, mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error ?? "Failed to verify OTP." };
      }

      if (data.access_token && data.refresh_token) {
        const { data: sessionData, error } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (sessionData.session) {
          setUser(toAuthSession(sessionData.session));
        }
        return { success: true, session: sessionData.session };
      }

      return { success: false, error: "Failed to establish session." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while verifying OTP.";
      return { success: false, error: msg };
    }
  };

  // Login with phone (sends OTP)
  const loginWithPhone = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    return sendOTP(phone);
  };

  // logout must be async so signOut() is awaited — otherwise the server token stays
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  const resetPasswordForEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (same folder as package.json), then restart the dev server." };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAppUrl("/reset-password"),
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while attempting to send the reset password email.";
      const isNetwork = msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network");
      return {
        success: false,
        error: isNetwork
          ? "Cannot reach Supabase. Check .env.local and that your Supabase project is not paused."
          : msg,
      };
    }
  };

  const updatePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (same folder as package.json), then restart the dev server." };
    }
    try {
      if (password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters long." };
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while updating the password.";
      return { success: false, error: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        sendOTP,
        verifyOTP,
        loginWithPhone,
        logout,
        resetPasswordForEmail,
        updatePassword,
        isAuthenticated: !!user,
        isAdmin,
        isCoachesAdmin,
        isCounselor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
