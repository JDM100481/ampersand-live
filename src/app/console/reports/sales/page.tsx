import { Card, PageHeader } from '@/components/ui';
import { canViewAdminReports } from '@/lib/permissions';
import { getCurrentRole, salesReportData } from '@/lib/supabase-data';

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function number(value: number) { return value.toLocaleString('en-PH'); }

export default async function SalesReportPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin access required for reports.</Card>;
  const report = await salesReportData();

  const salesCards = [
    ['Orders', report.salesSummary.orders], ['Customers', report.salesSummary.customers], ['Dias sold', number(report.salesSummary.diasSold)], ['Revenue PHP', money(report.salesSummary.revenuePhp)], ['COGS PHP', money(report.salesSummary.cogsPhp)], ['Gross profit PHP', money(report.salesSummary.grossProfitPhp)], ['Margin %', `${(report.salesSummary.marginPct * 100).toFixed(2)}%`],
  ];
  const inventoryCards = [
    ['Beginning Dias balance', number(report.inventorySummary.beginningDiasBalance)], ['Dias received', number(report.inventorySummary.diasReceived)], ['Dias sold', number(report.inventorySummary.diasSold)], ['Ending Dias balance', number(report.inventorySummary.endingDiasBalance)], ['Inventory value PHP', money(report.inventorySummary.inventoryValuePhp)],
  ];

  return <>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><PageHeader title="Sales Report" description="Admin-only Excel-style sales report using pooled procurement invoice cost per Dias." /><a className="rounded-xl bg-ampersand-600 px-4 py-2 text-sm font-semibold text-white" href="/console/reports/sales/export">Export CSV</a></div>

    <section className="mb-6"><h2 className="mb-3 text-lg font-semibold">Procurement Invoice Summary</h2><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{['Invoice Number','Supplier','USD amount','FX rate','Total PHP cost','Fees','Total landed cost','Dias received','Cost per Dias'].map((head) => <th className="px-4 py-3" key={head}>{head}</th>)}</tr></thead><tbody>{report.procurementBatches.length === 0 ? <tr><td className="px-4 py-4 text-slate-500" colSpan={9}>No procurement invoices yet.</td></tr> : report.procurementBatches.map((batch) => <tr className="border-t" key={batch.id}><td className="px-4 py-3 font-medium">{batch.invoiceNumber ?? batch.batchNumber}</td><td className="px-4 py-3">{batch.supplier}</td><td className="px-4 py-3">${batch.usdPurchaseAmount.toFixed(2)}</td><td className="px-4 py-3">{batch.fxRateUsdPhp.toFixed(4)}</td><td className="px-4 py-3">{money(batch.totalPhpCost)}</td><td className="px-4 py-3">{money(batch.feesPhp)}</td><td className="px-4 py-3">{money(batch.totalLandedCostPhp)}</td><td className="px-4 py-3">{number(batch.diasReceived)}</td><td className="px-4 py-3">{money(batch.costPerDiasPhp)}</td></tr>)}</tbody></table></div></section>

    <section className="mb-6"><h2 className="mb-3 text-lg font-semibold">Sales Summary</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{salesCards.map(([label, value]) => <Card key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>)}</div></section>

    <section className="mb-6"><h2 className="mb-3 text-lg font-semibold">Inventory Summary</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{inventoryCards.map(([label, value]) => <Card key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></Card>)}</div></section>

    <section><h2 className="mb-3 text-lg font-semibold">Sales Detail Table</h2><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{['Date','Customer','BIGO ID','Package','Dias sold','PHP amount','Payment method','Status','Fulfillment reference'].map((head) => <th className="px-4 py-3" key={head}>{head}</th>)}</tr></thead><tbody>{report.salesDetails.length === 0 ? <tr><td className="px-4 py-4 text-slate-500" colSpan={9}>No fulfilled sales yet.</td></tr> : report.salesDetails.map((row) => <tr className="border-t" key={`${row.date}-${row.bigoId}-${row.fulfillmentReference}`}><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3">{row.customer}</td><td className="px-4 py-3">{row.bigoId}</td><td className="px-4 py-3">{row.packageName}</td><td className="px-4 py-3">{number(row.diasSold)}</td><td className="px-4 py-3">{money(row.phpAmount)}</td><td className="px-4 py-3">{row.paymentMethod}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3">{row.fulfillmentReference}</td></tr>)}</tbody></table></div></section>
  </>;
}
