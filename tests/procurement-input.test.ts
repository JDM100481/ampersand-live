import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildProcurementInput,
  type ProcurementInputFormValues,
} from '../src/features/procurement/procurement-input.js';
import { canManageProcurement, canViewAdminReports } from '../src/lib/permissions.js';

const repoRoot = resolve(__dirname, '..');

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

const formValues: ProcurementInputFormValues = {
  invoiceNumber: 'BIGO-INV-2026-003',
  invoiceDate: '2026-06-14',
  invoiceStoragePath: 'invoices/BIGO-INV-2026-003.pdf',
  supplier: '',
  usdPurchaseAmount: 100,
  fxRateUsdPhp: 56.25,
  bankFeesPhp: 125,
  otherFeesPhp: 75,
  diasReceived: 12_500,
  settlementReference: 'WISE-SETTLEMENT-1',
  settlementDate: '2026-06-15',
  expectedReplenishmentDate: '2026-06-17',
  notes: 'June replenishment',
};

describe('procurement input workflow', () => {
  it('defaults supplier and derives PHP equivalent, total landed cost, and cost per Dias', () => {
    const input = buildProcurementInput(formValues);

    expect(input.supplier).toBe('BIGO Technology Pte. Ltd.');
    expect(input.phpEquivalent).toBe(5_625);
    expect(input.totalLandedPhpCost).toBe(5_825);
    expect(input.costPerDias).toBe(0.466);
  });

  it('builds invoice, inventory movement, and treasury outflow records when marked balance replenished', () => {
    const input = buildProcurementInput({ ...formValues, status: 'balance_replenished' });

    expect(input.procurementBatch).toEqual(expect.objectContaining({
      invoice_number: 'BIGO-INV-2026-003',
      batch_number: 'BIGO-INV-2026-003',
      invoice_date: '2026-06-14',
      supplier_name: 'BIGO Technology Pte. Ltd.',
      currency: 'USD',
      invoice_storage_path: 'invoices/BIGO-INV-2026-003.pdf',
      status: 'balance_replenished',
      usd_amount: 100,
      fx_rate_usd_php: 56.25,
      php_equivalent: 5_625,
      bank_fees_php: 125,
      other_fees_php: 75,
      total_landed_php_cost: 5_825,
      dias_received: 12_500,
      cost_per_dias_php: 0.466,
      settlement_reference: 'WISE-SETTLEMENT-1',
      settlement_date: '2026-06-15',
      expected_replenishment_date: '2026-06-17',
      notes: 'June replenishment',
    }));
    expect(input.inventoryMovement).toEqual(expect.objectContaining({
      movement_type: 'procurement_in',
      amount_usd: 100,
      amount_dias: 12_500,
      source_type: 'procurement_batch',
    }));
    expect(input.treasuryMovement).toEqual(expect.objectContaining({
      movement_type: 'procurement_out',
      currency: 'PHP',
      amount: 5_825,
      fx_rate_usd_php: 56.25,
      source_type: 'procurement_batch',
      reference_number: 'WISE-SETTLEMENT-1',
      movement_date: '2026-06-15',
    }));
  });

  it('requires an invoice attachment when BIGO has confirmed or replenished the balance', () => {
    expect(() => buildProcurementInput({ ...formValues, invoiceStoragePath: '', status: 'confirmed_by_bigo' })).toThrow('Invoice attachment is required');
    expect(() => buildProcurementInput({ ...formValues, invoiceStoragePath: '', status: 'balance_replenished' })).toThrow('Invoice attachment is required');
    expect(buildProcurementInput({ ...formValues, invoiceStoragePath: '', status: 'planned' }).procurementBatch.invoice_storage_path).toBeNull();
  });

  it('exposes procurement input only to admin and finance workflows', () => {
    expect(canManageProcurement('admin')).toBe(true);
    expect(canManageProcurement('finance')).toBe(true);
    expect(canViewAdminReports('admin')).toBe(true);
    expect(canViewAdminReports('finance')).toBe(true);
    for (const role of ['ops', 'reseller_manager', 'reseller'] as const) {
      expect(canManageProcurement(role)).toBe(false);
      expect(canViewAdminReports(role)).toBe(false);
    }

    const page = source('src/app/console/procurement/page.tsx');
    expect(page).toContain('createProcurementBatch');
    for (const field of [
      'invoice_number',
      'invoice_date',
      'supplier',
      'currency',
      'usd_purchase_amount',
      'fx_rate_usd_php',
      'php_equivalent',
      'bank_fees_php',
      'other_fees_php',
      'total_landed_php_cost',
      'dias_received',
      'cost_per_dias',
      'invoice_attachment',
      'settlement_reference',
      'settlement_date',
      'expected_replenishment_date',
      'notes',
    ]) {
      expect(page).toContain(field);
    }
    expect(page).toContain('Invoice Number');
    expect(page).not.toMatch(/Batch\s+[Nn]umber/);

    const action = source('src/lib/actions.ts');
    expect(action).toContain("storage.from('procurement-documents')");
    expect(action).toContain("formData.get('invoice_attachment')");

    const procurementReport = source('src/app/console/reports/procurement/page.tsx');
    expect(procurementReport).toContain('Invoice Number');
    expect(procurementReport).toContain('Invoice Date');
    expect(procurementReport).toContain('Invoice attachment');
    expect(procurementReport).not.toMatch(/Batch\s+[Nn]umber/);
  });

  it('keeps procurement costs off product and customer/order pages', () => {
    const productsPage = source('src/app/console/products/page.tsx');
    const ordersPage = source('src/app/console/orders/page.tsx');
    const newOrderPage = source('src/app/console/orders/new/page.tsx');
    const customersPagePath = resolve(repoRoot, 'src/app/console/customers/page.tsx');
    const customersPage = existsSync(customersPagePath) ? readFileSync(customersPagePath, 'utf8') : '';

    for (const page of [productsPage, ordersPage, newOrderPage, customersPage]) {
      expect(page).not.toMatch(/invoice|procurement cost|landed cost|cost per Dias|COGS|margin|profit|fx_rate_usd_php/i);
    }
  });

  it('adds procurement route and treasury outflow reporting support', () => {
    expect(source('src/lib/auth-routes.ts')).toContain("'/console'");
    expect(source('src/components/app-shell.tsx')).toContain("'/console/procurement'");
    expect(source('src/app/console/reports/treasury/page.tsx')).toContain('procurement_out');
    const migration = source('supabase/migrations/0006_procurement_invoice_numbers_and_documents.sql');
    expect(migration).toContain('invoice_number');
    expect(migration).toContain('invoice_storage_path');
    expect(migration).toContain('procurement-documents');
    expect(migration).toContain('storage.buckets');
    expect(migration).toContain("public.current_user_role() in ('admin', 'finance')");
  });
});
