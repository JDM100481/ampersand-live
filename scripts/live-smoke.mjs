import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path = '.env.local') {
  const out = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = line.indexOf('=');
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, i).trim()] = value;
  }
  return out;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const summary = { runId, buckets: {}, migration: {}, admin: {}, smoke: {}, confirmations: {} };

async function must(label, promise) {
  const res = await promise;
  if (res.error) throw new Error(`${label}: ${res.error.message} (${res.error.code ?? 'no-code'})`);
  return res.data;
}

const requiredTables = ['profiles', 'products', 'resellers', 'orders', 'payments', 'fulfillments', 'inventory_movements', 'treasury_accounts', 'treasury_movements'];
for (const table of requiredTables) {
  const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' });
  summary.migration[table] = error ? `ERROR ${error.code}: ${error.message}` : 'OK';
  if (error) throw new Error(`Migration/table verification failed for ${table}: ${error.message}`);
}

for (const bucket of ['payment-proofs', 'fulfillment-proofs', 'procurement-documents']) {
  const create = await supabase.storage.createBucket(bucket, { public: false });
  if (create.error && !/already exists|Duplicate/i.test(create.error.message)) {
    throw new Error(`Create bucket ${bucket}: ${create.error.message}`);
  }
  const info = await supabase.storage.getBucket(bucket);
  if (info.error) throw new Error(`Read bucket ${bucket}: ${info.error.message}`);
  summary.buckets[bucket] = { status: create.error ? 'already_exists' : 'created', public: info.data.public };
}

const adminEmail = 'admin+ampersand-live-console@example.com';
let userId;
let createdPassword = null;
const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (list.error) throw new Error(`List users: ${list.error.message}`);
const existing = list.data.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
if (existing) {
  userId = existing.id;
  summary.admin.auth_user = 'already_exists';
} else {
  createdPassword = crypto.randomBytes(18).toString('base64url') + 'Aa1!';
  const created = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: createdPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Ampersand Admin' },
  });
  if (created.error) throw new Error(`Create admin auth user: ${created.error.message}`);
  userId = created.data.user.id;
  summary.admin.auth_user = 'created';
  fs.writeFileSync(
    '.admin-credentials.local',
    `Ampersand LIVE Console first admin\nemail=${adminEmail}\npassword=${createdPassword}\ncreated_at=${new Date().toISOString()}\n`,
    { mode: 0o600 },
  );
}
await must('Upsert admin profile', supabase.from('profiles').upsert({ id: userId, full_name: 'Ampersand Admin', role: 'admin', is_active: true }, { onConflict: 'id' }).select('id,role').single());
summary.admin.profile = 'admin';
summary.admin.email = adminEmail;
summary.admin.password_saved_to = createdPassword ? '.admin-credentials.local' : 'not_changed_existing_user';

const treasury = await must('Create treasury account', supabase.from('treasury_accounts').insert({ name: `Smoke GCash ${runId}`, account_type: 'gcash', currency: 'PHP', notes: 'Automated live smoke test' }).select('*').single());
summary.smoke.treasury_account_id = treasury.id;

const product = await must('Create product', supabase.from('products').insert({ name: `Smoke BIGO Diamonds ${runId}`, bigo_sku: `SMOKE-${runId}`, diamond_amount: 100, unit_cost_usd: 1.50, unit_price_php: 120.00, is_active: true }).select('*').single());
summary.smoke.product_id = product.id;

const reseller = await must('Create reseller', supabase.from('resellers').insert({ name: `Smoke Reseller ${runId}`, contact_name: 'Smoke Operator', email: `smoke-${runId}@example.com`, status: 'active', commission_type: 'percentage', commission_rate: 0.10, notes: 'Automated live smoke test' }).select('*').single());
summary.smoke.reseller_id = reseller.id;

const quantity = 2;
const fx = 58.0;
const unitPricePhp = Number(product.unit_price_php);
const unitCostUsd = Number(product.unit_cost_usd);
const totalPricePhp = +(unitPricePhp * quantity).toFixed(2);
const totalCostUsd = +(unitCostUsd * quantity).toFixed(2);
const totalCostPhp = +(totalCostUsd * fx).toFixed(2);
const commissionAmountPhp = +(totalPricePhp * Number(reseller.commission_rate)).toFixed(2);
const order = await must('Create order', supabase.from('orders').insert({
  order_number: `SMOKE-${runId}`,
  customer_name: 'Smoke Customer',
  customer_contact: '+639****0000',
  bigo_id: `BIGO-${runId}`,
  product_id: product.id,
  reseller_id: reseller.id,
  quantity,
  status: 'awaiting_payment',
  unit_price_php: unitPricePhp,
  total_price_php: totalPricePhp,
  unit_cost_usd: unitCostUsd,
  total_cost_usd: totalCostUsd,
  fx_rate_usd_php: fx,
  total_cost_php: totalCostPhp,
  commission_rate: Number(reseller.commission_rate),
  commission_amount_php: commissionAmountPhp,
  source: 'manual',
  created_by: userId,
  notes: 'Automated live smoke test',
}).select('*').single());
summary.smoke.order_id = order.id;

const payment = await must('Create payment', supabase.from('payments').insert({ order_id: order.id, status: 'submitted', method: 'GCash', amount_php: totalPricePhp, reference_number: `PAY-${runId}`, received_at: new Date().toISOString(), submitted_by: userId, notes: 'Automated live smoke test' }).select('*').single());
summary.smoke.payment_id = payment.id;
await must('Order -> payment_submitted', supabase.from('orders').update({ status: 'payment_submitted' }).eq('id', order.id).select('id').single());
await must('Payment -> verified', supabase.from('payments').update({ status: 'verified', verified_by: userId, verified_at: new Date().toISOString() }).eq('id', payment.id).select('id').single());
await must('Order -> queued_for_fulfillment', supabase.from('orders').update({ status: 'queued_for_fulfillment' }).eq('id', order.id).select('id').single());
const treasuryMovement = await must('Create treasury movement', supabase.from('treasury_movements').insert({ treasury_account_id: treasury.id, movement_type: 'customer_payment_in', currency: 'PHP', amount: totalPricePhp, source_type: 'payment', source_id: payment.id, reference_number: `PAY-${runId}`, notes: 'Automated live smoke test', created_by: userId }).select('*').single());
summary.smoke.treasury_movement_id = treasuryMovement.id;

const fulfillment = await must('Create fulfillment', supabase.from('fulfillments').insert({ order_id: order.id, status: 'completed', bigo_reference: `BIGOREF-${runId}`, fulfilled_quantity: quantity, fulfilled_by: userId, fulfilled_at: new Date().toISOString(), notes: 'Automated live smoke test' }).select('*').single());
summary.smoke.fulfillment_id = fulfillment.id;
const inventoryMovement = await must('Create inventory movement', supabase.from('inventory_movements').insert({ movement_type: 'order_consumption', amount_usd: -totalCostUsd, source_type: 'order', source_id: order.id, notes: `Automated smoke fulfillment ${order.order_number}`, created_by: userId }).select('*').single());
summary.smoke.inventory_movement_id = inventoryMovement.id;
await must('Order -> fulfilled', supabase.from('orders').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() }).eq('id', order.id).select('id').single());

const finalOrder = await must('Read final order', supabase.from('orders').select('id, order_number, status, gross_profit_php').eq('id', order.id).single());
const { data: invRows, error: invErr } = await supabase.from('inventory_movements').select('id, amount_usd, movement_type').eq('source_id', order.id);
if (invErr) throw new Error(`Confirm inventory movement: ${invErr.message}`);
const { data: treasRows, error: treasErr } = await supabase.from('treasury_movements').select('id, amount, movement_type').eq('source_id', payment.id);
if (treasErr) throw new Error(`Confirm treasury movement: ${treasErr.message}`);
summary.confirmations.final_order_status = finalOrder.status;
summary.confirmations.gross_profit_php = Number(finalOrder.gross_profit_php);
summary.confirmations.inventory_movements = invRows.length;
summary.confirmations.inventory_amount_usd = invRows.reduce((sum, r) => sum + Number(r.amount_usd), 0);
summary.confirmations.treasury_movements = treasRows.length;
summary.confirmations.treasury_amount_php = treasRows.reduce((sum, r) => sum + Number(r.amount), 0);
console.log(JSON.stringify(summary, null, 2));
