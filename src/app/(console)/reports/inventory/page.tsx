import { Card, PageHeader } from '@/components/ui';
import { canViewAdminReports } from '@/lib/permissions';
import { getCurrentRole, salesReportData } from '@/lib/supabase-data';

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default async function InventoryReportPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin access required for reports.</Card>;
  const report = await salesReportData();
  const rows = [
    ['Beginning Dias balance', report.inventorySummary.beginningDiasBalance.toLocaleString('en-PH')],
    ['Dias received', report.inventorySummary.diasReceived.toLocaleString('en-PH')],
    ['Dias sold', report.inventorySummary.diasSold.toLocaleString('en-PH')],
    ['Ending Dias balance', report.inventorySummary.endingDiasBalance.toLocaleString('en-PH')],
    ['Inventory value PHP', money(report.inventorySummary.inventoryValuePhp)],
  ];
  return <>
    <PageHeader title="Inventory Report" description="Admin-only pooled Dias inventory report valued at procurement batch cost per Dias." />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">{rows.map(([label, value]) => <Card key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>)}</div>
  </>;
}
