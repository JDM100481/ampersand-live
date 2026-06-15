import { Card, PageHeader } from '@/components/ui';
import { canViewAdminReports } from '@/lib/permissions';
import { getCurrentRole, salesReportData } from '@/lib/supabase-data';

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function number(value: number) { return value.toLocaleString('en-PH'); }

export default async function ProcurementReportPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin or finance access required for reports.</Card>;
  const report = await salesReportData();
  return <>
    <PageHeader title="Procurement Report" description="Admin/finance BIGO Singapore batch landed cost and pooled cost-per-Dias report." />
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{['Batch number','Supplier','USD purchase amount','FX rate','PHP equivalent','Bank fees PHP','Other fees PHP','Total landed PHP cost','Dias received','Cost per Dias','Settlement reference','Settlement date','Expected replenishment date','Notes'].map((head) => <th className="px-4 py-3" key={head}>{head}</th>)}</tr></thead><tbody>{report.procurementBatches.length === 0 ? <tr><td className="px-4 py-4 text-slate-500" colSpan={14}>No procurement batches yet.</td></tr> : report.procurementBatches.map((batch) => <tr className="border-t" key={batch.id}><td className="px-4 py-3 font-medium">{batch.batchNumber}</td><td className="px-4 py-3">{batch.supplier}</td><td className="px-4 py-3">${batch.usdPurchaseAmount.toFixed(2)}</td><td className="px-4 py-3">{batch.fxRateUsdPhp.toFixed(4)}</td><td className="px-4 py-3">{money(batch.totalPhpCost)}</td><td className="px-4 py-3">{money(batch.bankFeesPhp ?? batch.feesPhp)}</td><td className="px-4 py-3">{money(batch.otherFeesPhp ?? 0)}</td><td className="px-4 py-3">{money(batch.totalLandedCostPhp)}</td><td className="px-4 py-3">{number(batch.diasReceived)}</td><td className="px-4 py-3">{money(batch.costPerDiasPhp)}</td><td className="px-4 py-3">{batch.settlementReference ?? '—'}</td><td className="px-4 py-3">{batch.settlementDate ?? '—'}</td><td className="px-4 py-3">{batch.expectedReplenishmentDate ?? '—'}</td><td className="px-4 py-3">—</td></tr>)}</tbody></table></div>
  </>;
}
