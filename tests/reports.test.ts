import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildSalesReport,
  exportSalesDetailsCsv,
  type ReportFulfillment,
  type ReportOrder,
  type ReportPayment,
  type ReportProcurementBatch,
} from '../src/features/reports/sales-report.js';
import { canExportReports, canViewAdminReports } from '../src/lib/permissions.js';
import { isProtectedConsolePath } from '../src/lib/auth-routes.js';

const repoRoot = resolve(__dirname, '..');

function source(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

const batches: ReportProcurementBatch[] = [
  {
    id: 'batch-1',
    batchNumber: 'BIGO-2026-001',
    invoiceNumber: 'BIGO-INV-2026-001',
    supplier: 'BIGO Technology Pte. Ltd.',
    usdPurchaseAmount: 100,
    fxRateUsdPhp: 56,
    feesPhp: 400,
    diasReceived: 12_000,
  },
  {
    id: 'batch-2',
    batchNumber: 'BIGO-2026-002',
    invoiceNumber: 'BIGO-INV-2026-002',
    supplier: 'BIGO Technology Pte. Ltd.',
    usdPurchaseAmount: 50,
    fxRateUsdPhp: 57,
    feesPhp: 150,
    diasReceived: 6_000,
  },
];

const orders: ReportOrder[] = [
  {
    id: 'order-1',
    date: '2026-06-01T10:00:00.000Z',
    customerName: 'Maria Santos',
    bigoId: 'bigo-maria',
    packageName: '1,000 Dias',
    packageDias: 1_000,
    quantity: 2,
    phpAmount: 2_000,
    status: 'fulfilled',
  },
  {
    id: 'order-2',
    date: '2026-06-02T10:00:00.000Z',
    customerName: 'Juan Dela Cruz',
    bigoId: 'bigo-juan',
    packageName: '500 Dias',
    packageDias: 500,
    quantity: 1,
    phpAmount: 650,
    status: 'fulfilled',
  },
];

const payments: ReportPayment[] = [
  { orderId: 'order-1', method: 'GCash', status: 'verified' },
  { orderId: 'order-2', method: 'BDO', status: 'verified' },
];

const fulfillments: ReportFulfillment[] = [
  { orderId: 'order-1', reference: 'BIGO-REF-1' },
  { orderId: 'order-2', reference: 'BIGO-REF-2' },
];

describe('Sprint 6 sales reports', () => {
  it('summarizes procurement invoices and uses pooled invoice cost per Dias for COGS', () => {
    const report = buildSalesReport({ beginningDiasBalance: 1_000, batches, orders, payments, fulfillments });

    expect(report.procurementBatches).toEqual([
      expect.objectContaining({
        invoiceNumber: 'BIGO-INV-2026-001',
        batchNumber: 'BIGO-2026-001',
        supplier: 'BIGO Technology Pte. Ltd.',
        totalPhpCost: 5_600,
        feesPhp: 400,
        totalLandedCostPhp: 6_000,
        diasReceived: 12_000,
        costPerDiasPhp: 0.5,
      }),
      expect.objectContaining({ totalPhpCost: 2_850, totalLandedCostPhp: 3_000, diasReceived: 6_000, costPerDiasPhp: 0.5 }),
    ]);

    expect(report.salesSummary.orders).toBe(2);
    expect(report.salesSummary.customers).toBe(2);
    expect(report.salesSummary.diasSold).toBe(2_500);
    expect(report.salesSummary.revenuePhp).toBe(2_650);
    expect(report.salesSummary.cogsPhp).toBe(1_250);
    expect(report.salesSummary.grossProfitPhp).toBe(1_400);
    expect(report.salesSummary.marginPct).toBe(0.5283);
  });

  it('matches inventory totals to ledger-style beginning, received, sold, ending, and value entries', () => {
    const report = buildSalesReport({ beginningDiasBalance: 1_000, batches, orders, payments, fulfillments });

    expect(report.inventorySummary).toEqual({
      beginningDiasBalance: 1_000,
      diasReceived: 18_000,
      diasSold: 2_500,
      endingDiasBalance: 16_500,
      inventoryValuePhp: 8_250,
    });
  });

  it('exports an Excel-compatible CSV sales detail table', () => {
    const report = buildSalesReport({ beginningDiasBalance: 1_000, batches, orders, payments, fulfillments });
    const csv = exportSalesDetailsCsv(report.salesDetails);

    expect(csv.split('\n')[0]).toBe('Date,Customer,BIGO ID,Package,Dias sold,PHP amount,Payment method,Status,Fulfillment reference');
    expect(csv).toContain('2026-06-01,Maria Santos,bigo-maria,"1,000 Dias",2000,2000.00,GCash,fulfilled,BIGO-REF-1');
  });

  it('keeps reports restricted to admin/finance and report exports restricted to admin/finance', () => {
    expect(canViewAdminReports('admin')).toBe(true);
    expect(canExportReports('admin')).toBe(true);
    expect(canViewAdminReports('finance')).toBe(true);
    expect(canExportReports('finance')).toBe(true);
    for (const role of ['ops', 'reseller_manager', 'reseller'] as const) {
      expect(canViewAdminReports(role)).toBe(false);
      expect(canExportReports(role)).toBe(false);
    }
    expect(isProtectedConsolePath('/console/reports')).toBe(true);
    expect(isProtectedConsolePath('/console/reports/sales')).toBe(true);
  });

  it('renders all required report routes and does not expose costs on product UI', () => {
    for (const route of ['reports', 'sales', 'procurement', 'inventory', 'treasury']) {
      const path = route === 'reports' ? 'src/app/console/reports/page.tsx' : `src/app/console/reports/${route}/page.tsx`;
      expect(source(path)).toBeTruthy();
    }

    const productsPage = source('src/app/console/products/page.tsx');
    expect(productsPage).not.toMatch(/COGS|Margin|Profit|FX rate|unit_cost_usd|procurement cost/i);
  });
});
