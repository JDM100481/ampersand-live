import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';
import { getCurrentRole } from '@/lib/supabase-data';
import { canViewAdminReports } from '@/lib/permissions';

const reports = [
  ['Sales', '/console/reports/sales', 'Procurement, sales, inventory, and detailed fulfilled order export.'],
  ['Procurement', '/console/reports/procurement', 'BIGO Singapore invoice landed cost and cost-per-Dias view.'],
  ['Inventory', '/console/reports/inventory', 'Pooled Dias beginning, received, sold, ending, and PHP value.'],
  ['Treasury', '/console/reports/treasury', 'Cash movement report shell for payment and settlement reconciliation.'],
] as const;

export default async function ReportsPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin access required for reports.</Card>;

  return <>
    <PageHeader title="Reports" description="Admin-only reporting hub. Customer and reseller screens stay cost-free." />
    <div className="grid gap-4 md:grid-cols-2">{reports.map(([title, href, description]) => <Link href={href} key={href}><Card className="h-full transition hover:border-ampersand-300 hover:shadow-md"><h2 className="font-semibold text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-600">{description}</p></Card></Link>)}</div>
  </>;
}
