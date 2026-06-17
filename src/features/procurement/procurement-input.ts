import { round2 } from '../../lib/money';

export type ProcurementStatus = 'planned' | 'invoice_received' | 'usd_sent' | 'confirmed_by_bigo' | 'balance_replenished' | 'cancelled';

export interface ProcurementInputFormValues {
  invoiceNumber: string;
  invoiceDate?: string;
  supplier?: string;
  currency?: 'USD';
  usdPurchaseAmount: number;
  fxRateUsdPhp: number;
  bankFeesPhp: number;
  otherFeesPhp: number;
  diasReceived: number;
  invoiceStoragePath?: string;
  settlementReference?: string;
  settlementDate?: string;
  expectedReplenishmentDate?: string;
  notes?: string;
  status?: ProcurementStatus;
}

export interface ProcurementBatchInsert {
  invoice_number: string;
  batch_number: string;
  invoice_date: string | null;
  supplier_name: string;
  currency: 'USD';
  status: ProcurementStatus;
  usd_amount: number;
  fx_rate_usd_php: number;
  php_equivalent: number;
  bank_fees_php: number;
  other_fees_php: number;
  total_landed_php_cost: number;
  dias_received: number;
  cost_per_dias_php: number;
  invoice_storage_path: string | null;
  settlement_reference: string | null;
  settlement_date: string | null;
  expected_replenishment_date: string | null;
  replenished_usd_amount: number | null;
  confirmed_at: string | null;
  notes: string | null;
}

export interface ProcurementInventoryMovementInsert {
  movement_type: 'procurement_in';
  amount_usd: number;
  amount_dias: number;
  source_type: 'procurement_batch';
  source_id?: string;
  notes: string;
}

export interface ProcurementTreasuryMovementInsert {
  movement_type: 'procurement_out';
  currency: 'PHP';
  amount: number;
  fx_rate_usd_php: number;
  source_type: 'procurement_batch';
  source_id?: string;
  reference_number: string | null;
  movement_date: string;
  notes: string;
}

export interface ProcurementInputResult {
  supplier: string;
  phpEquivalent: number;
  totalLandedPhpCost: number;
  costPerDias: number;
  procurementBatch: ProcurementBatchInsert;
  inventoryMovement: ProcurementInventoryMovementInsert | null;
  treasuryMovement: ProcurementTreasuryMovementInsert | null;
}

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

function assertNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number`);
  return value;
}

function assertPositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero`);
  return value;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function requiresInvoiceAttachment(status: ProcurementStatus): boolean {
  return status === 'confirmed_by_bigo' || status === 'balance_replenished';
}

export function buildProcurementInput(values: ProcurementInputFormValues): ProcurementInputResult {
  const invoiceNumber = clean(values.invoiceNumber);
  if (!invoiceNumber) throw new Error('Invoice number is required');

  const supplier = clean(values.supplier) ?? 'BIGO Technology Pte. Ltd.';
  const currency = values.currency ?? 'USD';
  const usdPurchaseAmount = round2(assertNonNegative(values.usdPurchaseAmount, 'USD invoice amount'));
  const fxRateUsdPhp = assertPositive(values.fxRateUsdPhp, 'FX rate');
  const bankFeesPhp = round2(assertNonNegative(values.bankFeesPhp, 'Bank fees PHP'));
  const otherFeesPhp = round2(assertNonNegative(values.otherFeesPhp, 'Other fees PHP'));
  const diasReceived = Math.trunc(assertPositive(values.diasReceived, 'Dias received'));
  const status = values.status ?? 'balance_replenished';
  const invoiceStoragePath = clean(values.invoiceStoragePath);
  if (requiresInvoiceAttachment(status) && !invoiceStoragePath) throw new Error('Invoice attachment is required when status is Confirmed or Balance Replenished');
  const phpEquivalent = round2(usdPurchaseAmount * fxRateUsdPhp);
  const totalLandedPhpCost = round2(phpEquivalent + bankFeesPhp + otherFeesPhp);
  const costPerDias = round4(totalLandedPhpCost / diasReceived);
  const settlementDate = clean(values.settlementDate);

  const procurementBatch: ProcurementBatchInsert = {
    invoice_number: invoiceNumber,
    batch_number: invoiceNumber,
    invoice_date: clean(values.invoiceDate),
    supplier_name: supplier,
    currency,
    status,
    usd_amount: usdPurchaseAmount,
    fx_rate_usd_php: fxRateUsdPhp,
    php_equivalent: phpEquivalent,
    bank_fees_php: bankFeesPhp,
    other_fees_php: otherFeesPhp,
    total_landed_php_cost: totalLandedPhpCost,
    dias_received: diasReceived,
    cost_per_dias_php: costPerDias,
    invoice_storage_path: invoiceStoragePath,
    settlement_reference: clean(values.settlementReference),
    settlement_date: settlementDate,
    expected_replenishment_date: clean(values.expectedReplenishmentDate),
    replenished_usd_amount: status === 'balance_replenished' ? usdPurchaseAmount : null,
    confirmed_at: status === 'balance_replenished' || status === 'confirmed_by_bigo' ? new Date().toISOString() : null,
    notes: clean(values.notes),
  };

  const inventoryMovement: ProcurementInventoryMovementInsert | null = status === 'balance_replenished'
    ? {
      movement_type: 'procurement_in',
      amount_usd: usdPurchaseAmount,
      amount_dias: diasReceived,
      source_type: 'procurement_batch',
      notes: `Procurement invoice ${invoiceNumber} replenished ${diasReceived.toLocaleString('en-PH')} Dias`,
    }
    : null;

  const treasuryMovement: ProcurementTreasuryMovementInsert | null = status === 'balance_replenished'
    ? {
      movement_type: 'procurement_out',
      currency: 'PHP',
      amount: totalLandedPhpCost,
      fx_rate_usd_php: fxRateUsdPhp,
      source_type: 'procurement_batch',
      reference_number: procurementBatch.settlement_reference,
      movement_date: settlementDate ?? new Date().toISOString().slice(0, 10),
      notes: `BIGO Technology Pte. Ltd. procurement invoice ${invoiceNumber}: USD invoice ${usdPurchaseAmount.toFixed(2)}, bank fees PHP ${bankFeesPhp.toFixed(2)}, other fees PHP ${otherFeesPhp.toFixed(2)}`,
    }
    : null;

  return { supplier, phpEquivalent, totalLandedPhpCost, costPerDias, procurementBatch, inventoryMovement, treasuryMovement };
}
