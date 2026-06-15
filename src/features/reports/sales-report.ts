import { round2 } from '../../lib/money';

export interface ReportProcurementBatch {
  id: string;
  batchNumber: string;
  supplier: string;
  usdPurchaseAmount: number;
  fxRateUsdPhp: number;
  feesPhp: number;
  diasReceived: number;
}

export interface ProcurementBatchSummary extends ReportProcurementBatch {
  totalPhpCost: number;
  totalLandedCostPhp: number;
  costPerDiasPhp: number;
}

export interface ReportOrder {
  id: string;
  date: string;
  customerName: string | null;
  bigoId: string;
  packageName: string;
  packageDias: number;
  quantity: number;
  phpAmount: number;
  status: string;
}

export interface ReportPayment {
  orderId: string;
  method: string;
  status: string;
}

export interface ReportFulfillment {
  orderId: string;
  reference: string | null;
}

export interface SalesDetailRow {
  date: string;
  customer: string;
  bigoId: string;
  packageName: string;
  diasSold: number;
  phpAmount: number;
  paymentMethod: string;
  status: string;
  fulfillmentReference: string;
}

export interface SalesReportInput {
  beginningDiasBalance: number;
  batches: ReportProcurementBatch[];
  orders: ReportOrder[];
  payments: ReportPayment[];
  fulfillments: ReportFulfillment[];
}

export interface SalesReport {
  procurementBatches: ProcurementBatchSummary[];
  salesSummary: {
    orders: number;
    customers: number;
    diasSold: number;
    revenuePhp: number;
    cogsPhp: number;
    grossProfitPhp: number;
    marginPct: number;
  };
  inventorySummary: {
    beginningDiasBalance: number;
    diasReceived: number;
    diasSold: number;
    endingDiasBalance: number;
    inventoryValuePhp: number;
  };
  salesDetails: SalesDetailRow[];
  pooledCostPerDiasPhp: number;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export function summarizeProcurementBatch(batch: ReportProcurementBatch): ProcurementBatchSummary {
  const totalPhpCost = round2(batch.usdPurchaseAmount * batch.fxRateUsdPhp);
  const feesPhp = round2(batch.feesPhp);
  const totalLandedCostPhp = round2(totalPhpCost + feesPhp);
  const diasReceived = Math.max(0, Math.trunc(batch.diasReceived));
  return {
    ...batch,
    feesPhp,
    diasReceived,
    totalPhpCost,
    totalLandedCostPhp,
    costPerDiasPhp: diasReceived === 0 ? 0 : round4(totalLandedCostPhp / diasReceived),
  };
}

export function computePooledCostPerDias(batches: ProcurementBatchSummary[]): number {
  const totalLandedCostPhp = round2(batches.reduce((sum, batch) => sum + batch.totalLandedCostPhp, 0));
  const diasReceived = batches.reduce((sum, batch) => sum + batch.diasReceived, 0);
  return diasReceived === 0 ? 0 : round4(totalLandedCostPhp / diasReceived);
}

export function buildSalesReport(input: SalesReportInput): SalesReport {
  const procurementBatches = input.batches.map(summarizeProcurementBatch);
  const pooledCostPerDiasPhp = computePooledCostPerDias(procurementBatches);
  const paymentsByOrder = new Map(input.payments.map((payment) => [payment.orderId, payment]));
  const fulfillmentsByOrder = new Map(input.fulfillments.map((fulfillment) => [fulfillment.orderId, fulfillment]));

  const salesDetails = input.orders.map((order) => {
    const diasSold = Math.max(0, Math.trunc(order.packageDias)) * Math.max(0, Math.trunc(order.quantity));
    const payment = paymentsByOrder.get(order.id);
    const fulfillment = fulfillmentsByOrder.get(order.id);
    return {
      date: dateOnly(order.date),
      customer: order.customerName || 'Customer',
      bigoId: order.bigoId,
      packageName: order.packageName,
      diasSold,
      phpAmount: round2(order.phpAmount),
      paymentMethod: payment?.method ?? '—',
      status: order.status,
      fulfillmentReference: fulfillment?.reference ?? '—',
    };
  });

  const orders = salesDetails.length;
  const customers = new Set(salesDetails.map((detail) => detail.customer).filter((customer) => customer !== 'Customer')).size;
  const diasSold = salesDetails.reduce((sum, detail) => sum + detail.diasSold, 0);
  const revenuePhp = round2(salesDetails.reduce((sum, detail) => sum + detail.phpAmount, 0));
  const cogsPhp = round2(diasSold * pooledCostPerDiasPhp);
  const grossProfitPhp = round2(revenuePhp - cogsPhp);
  const diasReceived = procurementBatches.reduce((sum, batch) => sum + batch.diasReceived, 0);
  const beginningDiasBalance = Math.max(0, Math.trunc(input.beginningDiasBalance));
  const endingDiasBalance = beginningDiasBalance + diasReceived - diasSold;

  return {
    procurementBatches,
    pooledCostPerDiasPhp,
    salesSummary: {
      orders,
      customers,
      diasSold,
      revenuePhp,
      cogsPhp,
      grossProfitPhp,
      marginPct: revenuePhp === 0 ? 0 : round4(grossProfitPhp / revenuePhp),
    },
    inventorySummary: {
      beginningDiasBalance,
      diasReceived,
      diasSold,
      endingDiasBalance,
      inventoryValuePhp: round2(endingDiasBalance * pooledCostPerDiasPhp),
    },
    salesDetails,
  };
}

function csvCell(value: string | number): string {
  const text = typeof value === 'number' ? value.toFixed(Number.isInteger(value) ? 0 : 2) : value;
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportSalesDetailsCsv(rows: SalesDetailRow[]): string {
  const header = ['Date', 'Customer', 'BIGO ID', 'Package', 'Dias sold', 'PHP amount', 'Payment method', 'Status', 'Fulfillment reference'];
  const body = rows.map((row) => [
    row.date,
    row.customer,
    row.bigoId,
    row.packageName,
    row.diasSold,
    row.phpAmount.toFixed(2),
    row.paymentMethod,
    row.status,
    row.fulfillmentReference,
  ].map(csvCell).join(','));
  return [header.join(','), ...body].join('\n');
}
