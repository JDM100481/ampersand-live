import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isProtectedConsolePath } from '../src/lib/auth-routes.js';

const repoRoot = resolve(__dirname, '..');

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('public storefront', () => {
  it('keeps storefront routes public while console routes remain protected', () => {
    for (const path of ['/', '/cart', '/checkout', '/checkout/success']) {
      expect(isProtectedConsolePath(path)).toBe(false);
    }
    for (const path of ['/console/dashboard', '/console/orders', '/console/procurement', '/console/reports/sales']) {
      expect(isProtectedConsolePath(path)).toBe(true);
    }
  });

  it('brands the public app separately from the internal console', () => {
    expect(source('src/app/layout.tsx')).toContain("title: 'Ampersand LIVE'");
    expect(source('src/app/layout.tsx')).not.toContain("title: 'Ampersand LIVE Console'");
    expect(source('src/app/page.tsx')).toContain('BIGO Dias Store');
    expect(source('src/app/login/page.tsx')).toContain('Admin Console');
  });

  it('renders catalog, cart, checkout, and success routes without console-only cost language', () => {
    for (const path of [
      'src/app/page.tsx',
      'src/app/cart/page.tsx',
      'src/app/checkout/page.tsx',
      'src/app/checkout/success/page.tsx',
    ]) {
      const page = source(path);
      expect(page).toBeTruthy();
      expect(page).not.toMatch(/procurement|COGS|gross profit|margin|unit_cost_usd|landed cost|cost per Dias/i);
    }
  });

  it('has a customer-facing checkout action that creates order intake and payment proof records', () => {
    const actions = source('src/lib/actions.ts');
    const actionBody = actions.match(/export async function createStorefrontOrder\(formData: FormData\) \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(actionBody).toContain('customer_name');
    expect(actionBody).toContain('customer_contact');
    expect(actionBody).toContain('bigo_id');
    expect(actionBody).toContain('cart_items');
    expect(actionBody).toContain('payment_proof');
    expect(actionBody).toContain('payment-proofs');
    expect(actionBody).toContain('orders');
    expect(actionBody).toContain('payments');
    expect(actionBody).toContain("source: 'storefront'");
    expect(actionBody).not.toMatch(/unit_cost_usd|gross_profit_php|procurement|COGS|margin/i);
  });

  it('adds database policies needed for public catalog reads and storefront order/payment intake', () => {
    const migration = source('supabase/migrations/0007_public_storefront.sql');

    expect(migration).toContain('public can view active products');
    expect(migration).toContain('public can create storefront orders');
    expect(migration).toContain('public can create storefront payments');
    expect(migration).toContain('payment-proofs');
  });
});
