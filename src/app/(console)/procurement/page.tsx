import { Card, PageHeader, StatusBadge, SubmitButton } from '@/components/ui';
import { createProcurementBatch } from '@/lib/actions';
import { canManageProcurement } from '@/lib/permissions';
import { getCurrentRole, listProcurementBatches, listTreasuryAccounts } from '@/lib/supabase-data';

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function number(value: number) { return value.toLocaleString('en-PH'); }

export default async function ProcurementPage() {
  const role = await getCurrentRole();
  if (!canManageProcurement(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin or finance access required for procurement.</Card>;

  const [batches, treasuryAccounts] = await Promise.all([listProcurementBatches(), listTreasuryAccounts()]);
  const settlementAccounts = treasuryAccounts.filter((account) => account.currency === 'PHP' || account.currency === 'USD');

  return <>
    <PageHeader title="Procurement Input" description="Record BIGO Singapore bulk procurement inflow. Landed cost and cost per Dias auto-calculate from settlement values." />
    <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
      <Card><h2 className="mb-4 font-semibold">Create procurement batch</h2><form action={createProcurementBatch} className="space-y-4">
        <div><label>Batch number</label><input name="batch_number" required placeholder="BIGO-2026-003" /></div>
        <div><label>Supplier</label><input defaultValue="BIGO Singapore" name="supplier" required /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>USD purchase amount</label><input min="0" name="usd_purchase_amount" required step="0.01" type="number" /></div><div><label>FX rate</label><input min="0.000001" name="fx_rate_usd_php" required step="0.000001" type="number" /></div></div>
        <div><label>PHP equivalent</label><input disabled name="php_equivalent" placeholder="Auto: USD purchase amount × FX rate" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Bank fees PHP</label><input defaultValue="0" min="0" name="bank_fees_php" required step="0.01" type="number" /></div><div><label>Other fees PHP</label><input defaultValue="0" min="0" name="other_fees_php" required step="0.01" type="number" /></div></div>
        <div><label>Total landed PHP cost</label><input disabled name="total_landed_php_cost" placeholder="Auto: PHP equivalent + bank fees + other fees" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Dias received</label><input min="1" name="dias_received" required step="1" type="number" /></div><div><label>Cost per Dias</label><input disabled name="cost_per_dias" placeholder="Auto: total landed / Dias" /></div></div>
        <div><label>Settlement reference</label><input name="settlement_reference" placeholder="Bank/Wise/BIGO reference" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Settlement date</label><input name="settlement_date" type="date" /></div><div><label>Expected replenishment date</label><input name="expected_replenishment_date" type="date" /></div></div>
        <div><label>Treasury account</label><select name="treasury_account_id"><option value="">Use first settlement/bank account</option>{settlementAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>)}</select></div>
        <label className="flex items-center gap-2"><input className="w-auto" defaultChecked name="balance_replenished" type="checkbox" /> Balance Replenished — create procurement_in inventory and procurement_out treasury movements</label>
        <div><label>Notes</label><textarea name="notes" rows={3} /></div>
        <SubmitButton>Create procurement batch</SubmitButton>
      </form></Card>
      <div className="space-y-3">{batches.length === 0 ? <Card>No procurement batches yet.</Card> : batches.map((batch) => {
        const phpEquivalent = Number(batch.php_equivalent ?? 0);
        const totalLanded = Number(batch.total_landed_php_cost ?? phpEquivalent + Number(batch.bank_fees_php ?? 0) + Number(batch.other_fees_php ?? 0));
        const costPerDias = Number(batch.cost_per_dias_php ?? (Number(batch.dias_received ?? 0) > 0 ? totalLanded / Number(batch.dias_received) : 0));
        return <Card key={batch.id}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{batch.batch_number}</h3><StatusBadge status={batch.status} /></div><p className="text-sm text-slate-600">{batch.supplier_name} • ${Number(batch.usd_amount).toFixed(2)} @ {Number(batch.fx_rate_usd_php).toFixed(4)}</p><p className="text-sm text-slate-500">Settlement {batch.settlement_reference ?? '—'} • Expected {batch.expected_replenishment_date ?? '—'}</p></div><div className="text-sm md:text-right"><p>Total landed: <strong>{money(totalLanded)}</strong></p><p>Dias received: <strong>{number(Number(batch.dias_received ?? 0))}</strong></p><p>Cost per Dias: <strong>{money(costPerDias)}</strong></p></div></div></Card>;
      })}</div>
    </div>
  </>;
}
