import { Card, PageHeader } from '@/components/ui';
import { canViewAdminReports } from '@/lib/permissions';
import { createProcurementInvoiceSignedUrl, getCurrentRole, salesReportData } from '@/lib/supabase-data';

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function number(value: number) { return value.toLocaleString('en-PH'); }

export default async function ProcurementReportPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin or finance access required for reports.</Card>;
  const report = await salesReportData();
  const invoiceLinks = new Map(await Promise.all(report.procurementBatches.map(async (batch) => {
    if (!batch.invoiceStoragePath) return [batch.id, null] as const;
    return [batch.id, await createProcurementInvoiceSignedUrl(batch.invoiceStoragePath)] as const;
  })));

  return <>
    <PageHeader title="Procurement Report" description="Admin/finance BIGO Singapore invoice landed cost and pooled cost-per-Dias report." />
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{['Invoice Number','Invoice Date','Supplier','USD Amount','FX','Total Landed Cost','Dias Received','Cost per Dias','Invoice attachment'].map((head) => <th className="px-4 py-3" key={head}>{head}</th>)}</tr></thead><tbody>{report.procurementBatches.length === 0 ? <tr><td className="px-4 py-4 text-slate-500" colSpan={9}>No procurement invoices yet.</td></tr> : report.procurementBatches.map((batch) => {
      const invoiceUrl = invoiceLinks.get(batch.id);
      return <tr className="border-t" key={batch.id}><td className="px-4 py-3 font-medium">{batch.invoiceNumber ?? batch.batchNumber}</td><td className="px-4 py-3">{batch.invoiceDate ?? '—'}</td><td className="px-4 py-3">{batch.supplier}</td><td className="px-4 py-3">${batch.usdPurchaseAmount.toFixed(2)}</td><td className="px-4 py-3">{batch.fxRateUsdPhp.toFixed(4)}</td><td className="px-4 py-3">{money(batch.totalLandedCostPhp)}</td><td className="px-4 py-3">{number(batch.diasReceived)}</td><td className="px-4 py-3">{money(batch.costPerDiasPhp)}</td><td className="px-4 py-3">{invoiceUrl ? <a className="font-semibold text-ampersand-700 underline" href={invoiceUrl}>View/download invoice</a> : '—'}</td></tr>;
    })}</tbody></table></div>
  </>;
}
