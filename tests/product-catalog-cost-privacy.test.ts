import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..');

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('product catalog cost privacy', () => {
  it('does not expose procurement-cost language or fields on the Products page', () => {
    const productsPage = source('src/app/(console)/products/page.tsx');

    expect(productsPage).not.toMatch(/USD Cost|Cost \$|cost basis|COGS|Margin|Profit|FX rate|unit_cost_usd/i);
    expect(productsPage).toMatch(/PHP Price|unit_price_php/);
    expect(productsPage).toMatch(/Diamonds|diamond_amount/);
    expect(productsPage).toMatch(/BIGO SKU|bigo_sku/);
  });

  it('creates product packages without accepting a USD cost from normal setup', () => {
    const actions = source('src/lib/actions.ts');
    const createProductBody = actions.match(/export async function createProduct\(formData: FormData\) \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(createProductBody).not.toContain("numberValue(formData, 'unit_cost_usd')");
    expect(createProductBody).toContain('unit_price_php');
    expect(createProductBody).toContain('diamond_amount');
  });

  it('does not use product records as the source of order cost basis', () => {
    const actions = source('src/lib/actions.ts');
    const createOrderBody = actions.match(/export async function createOrder\(formData: FormData\) \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(createOrderBody).not.toContain('product.unit_cost_usd');
    expect(createOrderBody).toContain('unitPricePhp: Number(product.unit_price_php)');
  });
});
