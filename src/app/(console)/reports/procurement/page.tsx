import { Card, PageHeader } from '@/components/ui';
import { canViewAdminReports } from '@/lib/permissions';
import { getCurrentRole, salesReportData } from '@/lib/supabase-data';

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default async function ProcurementReportPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin access required for reports.</Card>;
  const report = await salesReportData();
  return <>
    <PageHeader title="Procurement Report" description="Admin-only BIGO Singapore batch landed cost and pooled cost-per-Dias report." />
    <div className="space-y-3">{report.procurementBatches.length === 0 ? <Card>No procurement batches yet.</Card> : report.procurementBatches.map((batch) => <Card key={batch.id}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold">{batch.batchNumber}</h2><p className="text-sm text-slate-600">{batch.supplier} • ${batch.usdPurchaseAmount.toFixed(2)} @ {batch.fxRateUsdPhp.toFixed(4)}</p></div><div className="text-sm md:text-right"><p>Total landed: <strong>{money(batch.totalLandedCostPhp)}</strong></p><p>Dias: <strong>{batch.diasReceived.toLocaleString('en-PH')}</strong> • Cost/Dias: <strong>{money(batch.costPerDiasPhp)}</strong></p></div></div></Card>)}</div>
  </>;
}
