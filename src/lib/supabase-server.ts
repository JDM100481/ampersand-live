import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { requireSupabaseEnv } from './env';

export function createSupabaseServerClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options) { try { cookieStore.set({ name, value, ...options }); } catch {} },
      remove(name: string, options) { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
    },
  });
}
