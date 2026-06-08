'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase-server';
import { isSupabaseConfigured } from './env';
import { buildOrderSnapshot, generateOrderNumber } from '@/features/orders/order-financials';
import { assertTransition } from '@/features/orders/order-status';
import { assertPaymentTransition, validatePaymentForVerification, validateRejectionReason } from '@/features/payments/payment-status';
import { buildConsumptionMovement } from '@/features/inventory/inventory-ledger';

function requireConfigured() { if (!isSupabaseConfigured()) throw new Error('Supabase env vars are required for writes.'); return createSupabaseServerClient(); }
function stringValue(formData: FormData, key: string): string { return String(formData.get(key) ?? '').trim(); }
function numberValue(formData: FormData, key: string): number { const value = Number(formData.get(key)); if (!Number.isFinite(value)) throw new Error(`${key} must be a number`); return value; }

export async function signInWithPassword(formData: FormData) {
  const supabase = requireConfigured();
  const { error } = await supabase.auth.signInWithPassword({ email: stringValue(formData, 'email'), password: stringValue(formData, 'password') });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect('/dashboard');
}

export async function signOut() { const supabase = requireConfigured(); await supabase.auth.signOut(); redirect('/login'); }

export async function createProduct(formData: FormData) {
  const supabase = requireConfigured();
  const { error } = await supabase.from('products').insert({
    name: stringValue(formData, 'name'),
    bigo_sku: stringValue(formData, 'bigo_sku') || null,
    diamond_amount: stringValue(formData, 'diamond_amount') ? numberValue(formData, 'diamond_amount') : null,
    // Legacy schema requires this column, but product setup defines selling packages only.
    // Procurement/inventory modules own cost basis.
    unit_cost_usd: 0,
    unit_price_php: numberValue(formData, 'unit_price_php'),
    is_active: formData.get('is_active') === 'on',
  });
  if (error) throw new Error(error.message);
  revalidatePath('/products'); revalidatePath('/dashboard');
}

export async function archiveProduct(formData: FormData) {
  const supabase = requireConfigured();
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', stringValue(formData, 'id'));
  if (error) throw new Error(error.message);
  revalidatePath('/products');
}

export async function createReseller(formData: FormData) {
  const supabase = requireConfigured();
  const { error } = await supabase.from('resellers').insert({
    name: stringValue(formData, 'name'),
    contact_name: stringValue(formData, 'contact_name') || null,
    phone: stringValue(formData, 'phone') || null,
    email: stringValue(formData, 'email') || null,
    status: stringValue(formData, 'status') || 'active',
    commission_type: stringValue(formData, 'commission_type') || 'percentage',
    commission_rate: numberValue(formData, 'commission_rate'),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/resellers'); revalidatePath('/dashboard');
}

export async function createOrder(formData: FormData) {
  const supabase = requireConfigured();
  const productId = stringValue(formData, 'product_id');
  const resellerId = stringValue(formData, 'reseller_id') || null;
  const quantity = numberValue(formData, 'quantity');
  const fxRateUsdPhp = numberValue(formData, 'fx_rate_usd_php');
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, unit_price_php, is_active')
    .eq('id', productId)
    .single();
  if (productError || !product) throw new Error(productError?.message ?? 'Product not found');
  if (!product.is_active) throw new Error('Archived products cannot be ordered.');
  let reseller: { commission_type: 'percentage' | 'fixed'; commission_rate: number } | null = null;
  if (resellerId) {
    const { data, error } = await supabase.from('resellers').select('commission_type, commission_rate, status').eq('id', resellerId).single();
    if (error || !data) throw new Error(error?.message ?? 'Reseller not found');
    if (data.status !== 'active') throw new Error('Inactive resellers cannot create new orders.');
    reseller = data as { commission_type: 'percentage' | 'fixed'; commission_rate: number };
  }
  const snapshot = buildOrderSnapshot({ unitPricePhp: Number(product.unit_price_php), unitCostUsd: 0, quantity, fxRateUsdPhp, commissionType: reseller?.commission_type, commissionRate: reseller?.commission_rate });
  const today = new Date();
  const dayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString();
  const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', dayStart);
  const { error } = await supabase.from('orders').insert({
    order_number: generateOrderNumber(today, (count ?? 0) + 1),
    customer_name: stringValue(formData, 'customer_name') || null,
    customer_contact: stringValue(formData, 'customer_contact') || null,
    bigo_id: stringValue(formData, 'bigo_id'), product_id: productId, reseller_id: resellerId, quantity,
    status: 'awaiting_payment', unit_price_php: snapshot.unitPricePhp, total_price_php: snapshot.totalPricePhp,
    unit_cost_usd: snapshot.unitCostUsd, total_cost_usd: snapshot.totalCostUsd, fx_rate_usd_php: snapshot.fxRateUsdPhp,
    total_cost_php: snapshot.totalCostPhp, commission_rate: snapshot.commissionRate, commission_amount_php: snapshot.commissionAmountPhp,
    notes: stringValue(formData, 'notes') || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/orders'); revalidatePath('/dashboard');
}

export async function submitPayment(formData: FormData) {
  const supabase = requireConfigured();
  const orderId = stringValue(formData, 'order_id');
  const { data: order, error: fetchError } = await supabase.from('orders').select('status').eq('id', orderId).single();
  if (fetchError || !order) throw new Error(fetchError?.message ?? 'Order not found');
  assertTransition(order.status, 'payment_submitted');
  const { error: paymentError } = await supabase.from('payments').insert({ order_id: orderId, status: 'submitted', method: stringValue(formData, 'method'), amount_php: numberValue(formData, 'amount_php'), reference_number: stringValue(formData, 'reference_number') || null, proof_storage_path: stringValue(formData, 'proof_storage_path') || null, received_at: new Date().toISOString() });
  if (paymentError) throw new Error(paymentError.message);
  const { error } = await supabase.from('orders').update({ status: 'payment_submitted' }).eq('id', orderId);
  if (error) throw new Error(error.message);
  revalidatePath('/orders'); revalidatePath('/payments'); revalidatePath('/dashboard');
}

export async function verifyPayment(formData: FormData) {
  const supabase = requireConfigured();
  const paymentId = stringValue(formData, 'payment_id');
  const { data: payment, error } = await supabase.from('payments').select('*, orders(id, status, total_price_php)').eq('id', paymentId).single();
  if (error || !payment) throw new Error(error?.message ?? 'Payment not found');
  assertPaymentTransition(payment.status, 'verified');
  const validation = validatePaymentForVerification({ paymentAmountPhp: Number(payment.amount_php), orderAmountPhp: Number(payment.orders.total_price_php), varianceApproved: formData.get('variance_approved') === 'on' });
  if (!validation.ok) throw new Error(validation.reason);
  assertTransition(payment.orders.status, 'payment_verified');
  const { error: paymentError } = await supabase.from('payments').update({ status: 'verified', verified_at: new Date().toISOString() }).eq('id', paymentId);
  if (paymentError) throw new Error(paymentError.message);
  const { error: orderError } = await supabase.from('orders').update({ status: 'payment_verified' }).eq('id', payment.order_id);
  if (orderError) throw new Error(orderError.message);
  await supabase.from('orders').update({ status: 'queued_for_fulfillment' }).eq('id', payment.order_id);
  const treasuryAccountId = stringValue(formData, 'treasury_account_id');
  if (treasuryAccountId) await supabase.from('treasury_movements').insert({ treasury_account_id: treasuryAccountId, movement_type: 'customer_payment_in', currency: 'PHP', amount: Number(payment.amount_php), source_type: 'payment', source_id: paymentId, reference_number: payment.reference_number, notes: 'Created by payment verification' });
  revalidatePath('/payments'); revalidatePath('/fulfillment'); revalidatePath('/orders'); revalidatePath('/dashboard');
}

export async function rejectPayment(formData: FormData) {
  const supabase = requireConfigured();
  const paymentId = stringValue(formData, 'payment_id');
  const reason = stringValue(formData, 'rejection_reason');
  if (!validateRejectionReason(reason)) throw new Error('Rejection reason is required.');
  const { data: payment, error } = await supabase.from('payments').select('order_id, status').eq('id', paymentId).single();
  if (error || !payment) throw new Error(error?.message ?? 'Payment not found');
  assertPaymentTransition(payment.status, 'rejected');
  const { error: paymentError } = await supabase.from('payments').update({ status: 'rejected', rejection_reason: reason }).eq('id', paymentId);
  if (paymentError) throw new Error(paymentError.message);
  await supabase.from('orders').update({ status: 'payment_rejected' }).eq('id', payment.order_id);
  revalidatePath('/payments'); revalidatePath('/orders');
}

export async function fulfillOrder(formData: FormData) {
  const supabase = requireConfigured();
  const orderId = stringValue(formData, 'order_id');
  const bigoReference = stringValue(formData, 'bigo_reference');
  if (!bigoReference) throw new Error('BIGO reference is required.');
  if (formData.get('confirmed') !== 'on') throw new Error('Manual BIGO portal confirmation is required.');
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (error || !order) throw new Error(error?.message ?? 'Order not found');
  assertTransition(order.status, 'fulfilled');
  const { error: fulfillmentError } = await supabase.from('fulfillments').insert({ order_id: orderId, status: 'completed', bigo_reference: bigoReference, fulfilled_quantity: order.quantity, fulfilled_at: new Date().toISOString(), notes: stringValue(formData, 'notes') || null });
  if (fulfillmentError) throw new Error(fulfillmentError.message);
  const movement = buildConsumptionMovement({ totalCostUsd: Number(order.total_cost_usd), currentBalanceUsd: Number.POSITIVE_INFINITY, allowNegative: true });
  const { error: inventoryError } = await supabase.from('inventory_movements').insert({ movement_type: movement.movementType, amount_usd: movement.amountUsd, source_type: 'order', source_id: orderId, notes: `Fulfilled ${order.order_number} / BIGO ${bigoReference}` });
  if (inventoryError) throw new Error(inventoryError.message);
  const { error: orderError } = await supabase.from('orders').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() }).eq('id', orderId);
  if (orderError) throw new Error(orderError.message);
  revalidatePath('/fulfillment'); revalidatePath('/orders'); revalidatePath('/dashboard');
}
