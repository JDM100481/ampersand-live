const LEGACY_CONSOLE_PATHS = [
  '/dashboard',
  '/products',
  '/resellers',
  '/orders',
  '/payments',
  '/fulfillment',
  '/procurement',
  '/reports',
] as const;

const PROTECTED_CONSOLE_PATHS = ['/console'] as const;

export function isProtectedConsolePath(pathname: string): boolean {
  return PROTECTED_CONSOLE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getLegacyConsoleRedirectPath(pathname: string): string | null {
  const legacy = LEGACY_CONSOLE_PATHS.find((path) => pathname === path || pathname.startsWith(`${path}/`));
  return legacy ? `/console${pathname}` : null;
}
