import { supabase } from "@/lib/supabase";

export async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You must be signed in.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
