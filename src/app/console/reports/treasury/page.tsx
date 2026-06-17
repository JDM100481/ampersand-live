import { Card, PageHeader, StatusBadge } from '@/components/ui';
import { canViewAdminReports } from '@/lib/permissions';
import { getCurrentRole, listTreasuryMovements } from '@/lib/supabase-data';

function money(value: number, currency: string) {
  const prefix = currency === 'PHP' ? '₱' : '$';
  return `${prefix}${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function TreasuryReportPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin or finance access required for reports.</Card>;

  const movements = await listTreasuryMovements();
  const procurementOutflows = movements.filter((movement) => movement.movement_type === 'procurement_out' || movement.movement_type === 'usd_purchase_out');
  const totalProcurementOutflowPhp = procurementOutflows.reduce((sum, movement) => sum + (movement.currency === 'PHP' ? Number(movement.amount ?? 0) : 0), 0);

  return <>
    <PageHeader title="Treasury Report" description="Admin/finance treasury reconciliation for customer collections, USD settlement, procurement_out cash outflow, and fees." />
    <section className="mb-6 grid gap-4 md:grid-cols-3"><Card><p className="text-sm text-slate-500">Procurement cash outflow</p><p className="mt-2 text-2xl font-bold">{money(totalProcurementOutflowPhp, 'PHP')}</p></Card><Card><p className="text-sm text-slate-500">Procurement movements</p><p className="mt-2 text-2xl font-bold">{procurementOutflows.length}</p></Card><Card><p className="text-sm text-slate-500">Total treasury movements</p><p className="mt-2 text-2xl font-bold">{movements.length}</p></Card></section>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{['Date','Type','Account','Amount','Reference','Notes'].map((head) => <th className="px-4 py-3" key={head}>{head}</th>)}</tr></thead><tbody>{movements.length === 0 ? <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>No treasury movements yet.</td></tr> : movements.map((movement) => <tr className="border-t" key={movement.id}><td className="px-4 py-3">{movement.movement_date}</td><td className="px-4 py-3"><StatusBadge status={movement.movement_type} /></td><td className="px-4 py-3">{movement.treasury_accounts?.name ?? 'Treasury account'}</td><td className="px-4 py-3 font-medium">{money(Number(movement.amount ?? 0), movement.currency)}</td><td className="px-4 py-3">{movement.reference_number ?? '—'}</td><td className="px-4 py-3">{movement.notes ?? '—'}</td></tr>)}</tbody></table></div>
  </>;
}
