const PROTECTED_CONSOLE_PATHS = [
  '/dashboard',
  '/products',
  '/resellers',
  '/orders',
  '/payments',
  '/fulfillment',
] as const;

export function isProtectedConsolePath(pathname: string): boolean {
  return PROTECTED_CONSOLE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
