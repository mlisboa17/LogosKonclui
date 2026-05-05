import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env";

export function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  if (!url || !anonKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local",
    );
  }
  return createBrowserClient(url, anonKey);
}
