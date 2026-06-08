import { createSupabaseServerClient } from './supabase-server';
import { isSupabaseConfigured } from './env';

export type DbProduct = { id: string; name: string; bigo_sku: string | null; diamond_amount: number | null; unit_cost_usd: number; unit_price_php: number; is_active: boolean; effective_from: string; effective_to: string | null; created_at: string };
export type DbReseller = { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; status: 'active' | 'inactive' | 'suspended'; commission_type: 'percentage' | 'fixed'; commission_rate: number; created_at: string };
export type DbOrder = { id: string; order_number: string; customer_name: string | null; customer_contact: string | null; bigo_id: string; product_id: string; reseller_id: string | null; quantity: number; status: string; total_price_php: number; total_cost_usd: number; total_cost_php: number; commission_amount_php: number; gross_profit_php: number; created_at: string; products?: { name: string } | null; resellers?: { name: string } | null };
export type DbPayment = { id: string; order_id: string; status: string; method: string; amount_php: number; reference_number: string | null; proof_storage_path: string | null; created_at: string; orders?: { order_number: string; customer_name: string | null; total_price_php: number; status: string } | null };
export type DbTreasuryAccount = { id: string; name: string; currency: string; account_type: string };

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
  return safeQuery<DbOrder[]>(supabase.from('orders').select('*, products(name), resellers(name)').order('created_at', { ascending: false }).limit(100) as any, []);
}

export async function listPayments(): Promise<DbPayment[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbPayment[]>(supabase.from('payments').select('*, orders(order_number, customer_name, total_price_php, status)').order('created_at', { ascending: false }).limit(100) as any, []);
}

export async function listFulfillmentQueue(): Promise<DbOrder[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbOrder[]>(supabase.from('orders').select('*, products(name), resellers(name)').in('status', ['payment_verified', 'queued_for_fulfillment']).order('created_at', { ascending: true }) as any, []);
}

export async function listTreasuryAccounts(): Promise<DbTreasuryAccount[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseServerClient();
  return safeQuery<DbTreasuryAccount[]>(supabase.from('treasury_accounts').select('id, name, currency, account_type').eq('is_active', true).order('name') as any, []);
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
