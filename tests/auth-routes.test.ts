import { describe, expect, it } from 'vitest';
import { getLegacyConsoleRedirectPath, isProtectedConsolePath } from '../src/lib/auth-routes';

describe('console route separation', () => {
  it.each([
    '/console/dashboard',
    '/console/products',
    '/console/resellers',
    '/console/orders',
    '/console/orders/new',
    '/console/payments',
    '/console/fulfillment',
    '/console/procurement',
    '/console/reports',
    '/console/reports/sales',
  ])('protects %s', (pathname) => {
    expect(isProtectedConsolePath(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/cart',
    '/checkout',
    '/checkout/success',
    '/login',
    '/_next/static/app.js',
    '/favicon.ico',
    '/orders-new',
    '/payment',
  ])('does not protect %s', (pathname) => {
    expect(isProtectedConsolePath(pathname)).toBe(false);
  });

  it.each([
    ['/dashboard', '/console/dashboard'],
    ['/products', '/console/products'],
    ['/orders/new', '/console/orders/new'],
    ['/procurement', '/console/procurement'],
    ['/reports/sales', '/console/reports/sales'],
  ])('redirects legacy console path %s to %s', (legacyPath, consolePath) => {
    expect(getLegacyConsoleRedirectPath(legacyPath)).toBe(consolePath);
  });
});
