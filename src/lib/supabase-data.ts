import { buildSalesReport, type ReportFulfillment, type ReportOrder, type ReportPayment, type ReportProcurementBatch } from '@/features/reports/sales-report';
import { createSupabaseServerClient } from './supabase-server';
import { isSupabaseConfigured } from './env';
import { isRole, type Role } from './permissions';

export type DbProduct = { id: string; name: string; bigo_sku: string | null; diamond_amount: number | null; unit_cost_usd: number; unit_price_php: number; is_active: boolean; effective_from: string; effective_to: string | null; created_at: string };
export type DbReseller = { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; status: 'active' | 'inactive' | 'suspended'; commission_type: 'percentage' | 'fixed'; commission_rate: number; created_at: string };
export type DbOrder = { id: string; order_number: string; customer_name: string | null; customer_contact: string | null; bigo_id: string; product_id: string; reseller_id: string | null; quantity: number; status: string; total_price_php: number; total_cost_usd: number; total_cost_php: number; commission_amount_php: number; gross_profit_php: number; created_at: string; fulfilled_at?: string | null; package_dias?: number | null; products?: { name: string; diamond_amount?: number | null } | null; resellers?: { name: string } | null };
export type DbPayment = { id: string; order_id: string; status: string; method: string; amount_php: number; reference_number: string | null; proof_storage_path: string | null; created_at: string; orders?: { order_number: string; customer_name: string | null; total_price_php: number; status: string } | null };
export type DbTreasuryAccount = { id: string; name: string; currency: string; account_type: string };
export type DbProcurementBatch = { id: string; invoice_number?: string | null; batch_number: string; invoice_date?: string | null; supplier_name: string; currency?: string | null; usd_amount: number; fx_rate_usd_php: number; php_equivalent: number; bank_fees_php: number; other_fees_php?: number | null; total_landed_php_cost?: number | null; dias_received?: number | null; cost_per_dias_php?: number | null; invoice_storage_path?: string | null; settlement_reference?: string | null; settlement_date?: string | null; expected_replenishment_date?: string | null; created_at: string; status: string; notes?: string | null };
export type DbFulfillment = { id: string; order_id: string; status: string; bigo_reference: string | null; created_at: string; fulfilled_at: string | null };
export type DbTreasuryMovement = { id: string; movement_type: string; currency: string; amount: number; fx_rate_usd_php: number | null; source_type: string; source_id: string | null; reference_number: string | null; movement_date: string; notes: string | null; created_at: string; treasury_accounts?: { name: string; currency: string } | null };

async function safeQuery<T>(query: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  const { data, error } = await query;
  if (error) { console.error(error); return fallback; }
  return data ?? fallback;
}

export async function getSessionUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getCurrentRole(): Promise<Role> {
  if (!isSupabaseConfigured()) return 'admin';
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'ops';
  const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (error || !data || !isRole(String(data.role))) return 'ops';
  return data.role as Role;
}

export async function listProducts(includeInactive = false): Promise<DbProduct[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!includeInactive) query = query.eq('is_active', true);
  return safeQuery<DbProduct[]>(query as any, []);
}

export async function listResellers(): Promise<DbReseller[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbReseller[]>(supabase.from('resellers').select('*').order('created_at', { ascending: false }) as any, []);
}

export async function listOrders(): Promise<DbOrder[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbOrder[]>(supabase.from('orders').select('*, products(name, diamond_amount), resellers(name)').order('created_at', { ascending: false }).limit(500) as any, []);
}

export async function listPayments(): Promise<DbPayment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbPayment[]>(supabase.from('payments').select('*, orders(order_number, customer_name, total_price_php, status)').order('created_at', { ascending: false }).limit(500) as any, []);
}

export async function listFulfillmentQueue(): Promise<DbOrder[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbOrder[]>(supabase.from('orders').select('*, products(name, diamond_amount), resellers(name)').in('status', ['payment_verified', 'queued_for_fulfillment']).order('created_at', { ascending: true }) as any, []);
}

export async function listTreasuryAccounts(): Promise<DbTreasuryAccount[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbTreasuryAccount[]>(supabase.from('treasury_accounts').select('id, name, currency, account_type').eq('is_active', true).order('name') as any, []);
}

export async function listProcurementBatches(): Promise<DbProcurementBatch[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbProcurementBatch[]>(supabase.from('procurement_batches').select('*').order('created_at', { ascending: false }).limit(500) as any, []);
}

export async function createProcurementInvoiceSignedUrl(path: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage.from('procurement-documents').createSignedUrl(path, 60 * 10, { download: true });
  if (error) { console.error(error); return null; }
  return data.signedUrl;
}

export async function listFulfillments(): Promise<DbFulfillment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbFulfillment[]>(supabase.from('fulfillments').select('id, order_id, status, bigo_reference, created_at, fulfilled_at').order('created_at', { ascending: false }).limit(500) as any, []);
}

export async function listTreasuryMovements(): Promise<DbTreasuryMovement[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbTreasuryMovement[]>(supabase.from('treasury_movements').select('*, treasury_accounts(name, currency)').order('movement_date', { ascending: false }).limit(500) as any, []);
}

export async function salesReportData() {
  const [batches, orders, payments, fulfillments] = await Promise.all([listProcurementBatches(), listOrders(), listPayments(), listFulfillments()]);
  const procurementBatches: ReportProcurementBatch[] = batches
    .filter((batch) => batch.status !== 'cancelled')
    .map((batch) => ({
      id: batch.id,
      invoiceNumber: batch.invoice_number || batch.batch_number,
      batchNumber: batch.invoice_number || batch.batch_number,
      invoiceDate: batch.invoice_date,
      supplier: batch.supplier_name || 'BIGO Technology Pte. Ltd.',
      currency: batch.currency || 'USD',
      usdPurchaseAmount: Number(batch.usd_amount ?? 0),
      fxRateUsdPhp: Number(batch.fx_rate_usd_php ?? 0),
      phpEquivalent: Number(batch.php_equivalent ?? 0),
      bankFeesPhp: Number(batch.bank_fees_php ?? 0),
      otherFeesPhp: Number(batch.other_fees_php ?? 0),
      feesPhp: Number(batch.bank_fees_php ?? 0) + Number(batch.other_fees_php ?? 0),
      diasReceived: Number(batch.dias_received ?? 0),
      settlementReference: batch.settlement_reference,
      settlementDate: batch.settlement_date,
      expectedReplenishmentDate: batch.expected_replenishment_date,
      invoiceStoragePath: batch.invoice_storage_path,
      status: batch.status,
    }));
  const reportOrders: ReportOrder[] = orders
    .filter((order) => order.status === 'fulfilled')
    .map((order) => ({
      id: order.id,
      date: order.fulfilled_at ?? order.created_at,
      customerName: order.customer_name,
      bigoId: order.bigo_id,
      packageName: order.products?.name ?? 'BIGO package',
      packageDias: Number(order.package_dias ?? order.products?.diamond_amount ?? 0),
      quantity: Number(order.quantity ?? 0),
      phpAmount: Number(order.total_price_php ?? 0),
      status: order.status,
    }));
  const reportPayments: ReportPayment[] = payments.map((payment) => ({ orderId: payment.order_id, method: payment.method, status: payment.status }));
  const reportFulfillments: ReportFulfillment[] = fulfillments.map((fulfillment) => ({ orderId: fulfillment.order_id, reference: fulfillment.bigo_reference }));
  return buildSalesReport({ beginningDiasBalance: 0, batches: procurementBatches, orders: reportOrders, payments: reportPayments, fulfillments: reportFulfillments });
}

export async function dashboardMetrics() {
  const [orders, payments, products, resellers, fulfillmentQueue] = await Promise.all([listOrders(), listPayments(), listProducts(true), listResellers(), listFulfillmentQueue()]);
  const fulfilled = orders.filter((order) => order.status === 'fulfilled');
  const revenue = fulfilled.reduce((sum, order) => sum + Number(order.total_price_php ?? 0), 0);
  const grossProfit = fulfilled.reduce((sum, order) => sum + Number(order.gross_profit_php ?? 0), 0);
  return {
    orderCount: orders.length,
    paymentQueue: payments.filter((payment) => payment.status === 'submitted' || payment.status === 'needs_review').length,
    fulfillmentQueue: fulfillmentQueue.length,
    activeProducts: products.filter((product) => product.is_active).length,
    activeResellers: resellers.filter((reseller) => reseller.status === 'active').length,
    revenue,
    grossProfit,
    grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
  };
}
