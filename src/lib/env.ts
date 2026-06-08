export function getSupabaseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined; }
export function getSupabaseAnonKey(): string | undefined { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined; }
export function isSupabaseConfigured(): boolean { return Boolean(getSupabaseUrl() && getSupabaseAnonKey()); }
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return { url, anonKey };
}
