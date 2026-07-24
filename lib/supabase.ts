import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** True if real Supabase env vars are set (not the build-time placeholder). */
export function isSupabaseConfigured(): boolean {
  if (typeof window === "undefined") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && url !== PLACEHOLDER_URL && url.length > 10;
}
