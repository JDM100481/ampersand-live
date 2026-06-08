import { Card, PageHeader } from '@/components/ui';
import { dashboardMetrics } from '@/lib/supabase-data';
import { isSupabaseConfigured } from '@/lib/env';

export default async function DashboardPage() {
  const metrics = await dashboardMetrics();
  const cards = [
    ['Orders', metrics.orderCount], ['Payment Queue', metrics.paymentQueue], ['Fulfillment Queue', metrics.fulfillmentQueue], ['Active Products', metrics.activeProducts], ['Active Resellers', metrics.activeResellers], ['Revenue PHP', metrics.revenue.toFixed(2)], ['Gross Profit PHP', metrics.grossProfit.toFixed(2)], ['Gross Margin %', metrics.grossMarginPct.toFixed(2)]
  ];
  return <>
    <PageHeader title="Dashboard" description="Daily operating view for orders, payment verification, fulfillment, and margin." />
    {!isSupabaseConfigured() && <Card className="mb-6 border-amber-200 bg-amber-50"><p className="text-sm text-amber-900">Supabase env vars are empty, so the app is running in safe preview mode with empty data. Configure .env.local to enable live reads/writes.</p></Card>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <Card key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>)}</div>
  </>;
}
