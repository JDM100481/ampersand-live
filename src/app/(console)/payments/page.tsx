import { Card, PageHeader, StatusBadge, SubmitButton } from '@/components/ui';
import { rejectPayment, submitPayment, verifyPayment } from '@/lib/actions';
import { listOrders, listPayments, listTreasuryAccounts } from '@/lib/supabase-data';

export default async function PaymentsPage() {
  const [orders, payments, accounts] = await Promise.all([listOrders(), listPayments(), listTreasuryAccounts()]);
  const payableOrders = orders.filter((order) => ['awaiting_payment', 'payment_rejected'].includes(order.status));
  return <>
    <PageHeader title="Payment Verification" description="Record customer payment proof, verify funds, reject issues, and optionally create PHP treasury inflow." />
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card><h2 className="mb-4 font-semibold">Record payment</h2><form action={submitPayment} className="space-y-4">
        <div><label>Order</label><select name="order_id" required><option value="">Select unpaid order</option>{payableOrders.map((order) => <option key={order.id} value={order.id}>{order.order_number} — ₱{Number(order.total_price_php).toFixed(2)}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Method</label><select name="method"><option>GCash</option><option>Maya</option><option>Bank transfer</option><option>Cash</option><option>Other</option></select></div><div><label>Amount PHP</label><input name="amount_php" required step="0.01" type="number" /></div></div>
        <div><label>Reference number</label><input name="reference_number" /></div><div><label>Proof storage path / note</label><input name="proof_storage_path" placeholder="payment-proofs/..." /></div><SubmitButton>Submit payment</SubmitButton>
      </form></Card>
      <div className="space-y-3">{payments.length === 0 ? <Card>No payments yet.</Card> : payments.map((payment) => <Card key={payment.id}><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{payment.orders?.order_number ?? payment.order_id}</h3><StatusBadge status={payment.status} /></div><p className="text-sm text-slate-600">{payment.method} • ₱{Number(payment.amount_php).toFixed(2)} • Ref {payment.reference_number ?? '—'}</p><p className="text-xs text-slate-500">Order status: {payment.orders?.status ?? '—'}</p></div>{payment.status !== 'verified' && payment.status !== 'rejected' && <div className="grid gap-2 md:w-72"><form action={verifyPayment} className="space-y-2"><input name="payment_id" type="hidden" value={payment.id} /><select name="treasury_account_id"><option value="">No treasury account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>)}</select><label className="flex items-center gap-2 text-xs"><input className="w-auto" name="variance_approved" type="checkbox" /> Approve variance</label><SubmitButton>Verify</SubmitButton></form><form action={rejectPayment} className="flex gap-2"><input name="payment_id" type="hidden" value={payment.id} /><input name="rejection_reason" placeholder="Reason" required /><button className="rounded-xl border border-rose-300 px-3 py-2 text-sm text-rose-700" type="submit">Reject</button></form></div>}</div></Card>)}</div>
    </div>
  </>;
}
