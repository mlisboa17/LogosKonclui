export function getSupabasePublicEnv(): {
  url: string | undefined;
  anonKey: string | undefined;
  isConfigured: boolean;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}
