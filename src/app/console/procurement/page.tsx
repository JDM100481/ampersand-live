import { Card, PageHeader, StatusBadge, SubmitButton } from '@/components/ui';
import { createProcurementBatch } from '@/lib/actions';
import { canManageProcurement } from '@/lib/permissions';
import { getCurrentRole, listProcurementBatches, listTreasuryAccounts } from '@/lib/supabase-data';

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function number(value: number) { return value.toLocaleString('en-PH'); }

const statusOptions = [
  ['planned', 'Planned'],
  ['invoice_received', 'Invoice Received'],
  ['usd_sent', 'USD Sent'],
  ['confirmed_by_bigo', 'Confirmed'],
  ['balance_replenished', 'Balance Replenished'],
  ['cancelled', 'Cancelled'],
] as const;

export default async function ProcurementPage() {
  const role = await getCurrentRole();
  if (!canManageProcurement(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin or finance access required for procurement.</Card>;

  const [batches, treasuryAccounts] = await Promise.all([listProcurementBatches(), listTreasuryAccounts()]);
  const settlementAccounts = treasuryAccounts.filter((account) => account.currency === 'PHP' || account.currency === 'USD');

  return <>
    <PageHeader title="Procurement Input" description="Record BIGO Singapore invoice-based procurement inflow. Landed cost and cost per Dias auto-calculate from settlement values." />
    <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
      <Card><h2 className="mb-4 font-semibold">Create procurement invoice</h2><form action={createProcurementBatch} className="space-y-4" encType="multipart/form-data">
        <div><label>Invoice Number</label><input name="invoice_number" required placeholder="BIGO-INV-2026-003" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Invoice Date</label><input name="invoice_date" type="date" /></div><div><label>Currency</label><input defaultValue="USD" name="currency" readOnly /></div></div>
        <div><label>Supplier</label><input defaultValue="BIGO Technology Pte. Ltd." name="supplier" required /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>USD Invoice Amount</label><input min="0" name="usd_purchase_amount" required step="0.01" type="number" /></div><div><label>FX Rate</label><input min="0.000001" name="fx_rate_usd_php" required step="0.000001" type="number" /></div></div>
        <div><label>PHP Equivalent</label><input disabled name="php_equivalent" placeholder="Auto: USD invoice amount × FX rate" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Bank Fees PHP</label><input defaultValue="0" min="0" name="bank_fees_php" required step="0.01" type="number" /></div><div><label>Other Fees PHP</label><input defaultValue="0" min="0" name="other_fees_php" required step="0.01" type="number" /></div></div>
        <div><label>Total Landed PHP Cost</label><input disabled name="total_landed_php_cost" placeholder="Auto: PHP equivalent + bank fees + other fees" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Dias Received</label><input min="1" name="dias_received" required step="1" type="number" /></div><div><label>Cost per Dias</label><input disabled name="cost_per_dias" placeholder="Auto: total landed / Dias" /></div></div>
        <div><label>Invoice Attachment</label><input accept="application/pdf,image/jpeg,image/png" name="invoice_attachment" type="file" /><p className="mt-1 text-xs text-slate-500">Required when status is Confirmed or Balance Replenished. Accepted: PDF, JPG, PNG.</p></div>
        <div><label>Settlement Reference</label><input name="settlement_reference" placeholder="Bank/Wise/BIGO reference" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Settlement Date</label><input name="settlement_date" type="date" /></div><div><label>Expected Replenishment Date</label><input name="expected_replenishment_date" type="date" /></div></div>
        <div><label>Status</label><select defaultValue="balance_replenished" name="status">{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label>Treasury account</label><select name="treasury_account_id"><option value="">Use first settlement/bank account</option>{settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>)}</select></div>
        <div><label>Notes</label><textarea name="notes" rows={3} /></div>
        <SubmitButton>Create procurement invoice</SubmitButton>
      </form></Card>
      <div className="space-y-3">{batches.length === 0 ? <Card>No procurement invoices yet.</Card> : batches.map((batch) => {
        const phpEquivalent = Number(batch.php_equivalent ?? 0);
        const totalLanded = Number(batch.total_landed_php_cost ?? phpEquivalent + Number(batch.bank_fees_php ?? 0) + Number(batch.other_fees_php ?? 0));
        const costPerDias = Number(batch.cost_per_dias_php ?? (Number(batch.dias_received ?? 0) > 0 ? totalLanded / Number(batch.dias_received) : 0));
        const invoiceNumber = batch.invoice_number ?? batch.batch_number;
        return <Card key={batch.id}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{invoiceNumber}</h3><StatusBadge status={batch.status} /></div><p className="text-sm text-slate-600">{batch.supplier_name} • ${Number(batch.usd_amount).toFixed(2)} @ {Number(batch.fx_rate_usd_php).toFixed(4)}</p><p className="text-sm text-slate-500">Invoice date {batch.invoice_date ?? '—'} • Settlement {batch.settlement_reference ?? '—'} • Expected {batch.expected_replenishment_date ?? '—'}</p></div><div className="text-sm md:text-right"><p>Total landed: <strong>{money(totalLanded)}</strong></p><p>Dias received: <strong>{number(Number(batch.dias_received ?? 0))}</strong></p><p>Cost per Dias: <strong>{money(costPerDias)}</strong></p></div></div></Card>;
      })}</div>
    </div>
  </>;
}
