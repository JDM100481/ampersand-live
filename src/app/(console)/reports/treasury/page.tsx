import { Card, PageHeader } from '@/components/ui';
import { canViewAdminReports } from '@/lib/permissions';
import { getCurrentRole } from '@/lib/supabase-data';

export default async function TreasuryReportPage() {
  const role = await getCurrentRole();
  if (!canViewAdminReports(role)) return <Card className="border-rose-200 bg-rose-50 text-rose-900">Admin access required for reports.</Card>;
  return <>
    <PageHeader title="Treasury Report" description="Admin-only treasury reconciliation shell for customer collections, USD settlement, and fees." />
    <Card><p className="text-sm text-slate-600">Treasury reporting is protected here so customer and reseller UI cannot expose FX, COGS, landed costs, or margins. Connect treasury movement filters in the next accounting sprint.</p></Card>
  </>;
}
