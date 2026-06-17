import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getLegacyConsoleRedirectPath, isProtectedConsolePath } from './lib/auth-routes';

export async function middleware(request: NextRequest) {
  const legacyConsolePath = getLegacyConsoleRedirectPath(request.nextUrl.pathname);
  if (legacyConsolePath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyConsolePath;
    return NextResponse.redirect(redirectUrl);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value; },
      set(name: string, value: string, options) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && isProtectedConsolePath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
