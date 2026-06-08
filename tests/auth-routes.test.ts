import { describe, expect, it } from 'vitest';
import { isProtectedConsolePath } from '../src/lib/auth-routes';

describe('isProtectedConsolePath', () => {
  it.each([
    '/dashboard',
    '/products',
    '/resellers',
    '/orders',
    '/orders/new',
    '/payments',
    '/fulfillment',
  ])('protects %s', (pathname) => {
    expect(isProtectedConsolePath(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/login',
    '/_next/static/app.js',
    '/favicon.ico',
    '/orders-new',
    '/payment',
  ])('does not protect %s', (pathname) => {
    expect(isProtectedConsolePath(pathname)).toBe(false);
  });
});
