import { NextResponse } from 'next/server';
import { exportSalesDetailsCsv } from '@/features/reports/sales-report';
import { canExportReports } from '@/lib/permissions';
import { getCurrentRole, salesReportData } from '@/lib/supabase-data';

export async function GET() {
  const role = await getCurrentRole();
  if (!canExportReports(role)) return new NextResponse('Admin access required', { status: 403 });
  const report = await salesReportData();
  return new NextResponse(exportSalesDetailsCsv(report.salesDetails), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ampersand-live-sales-report.csv"',
    },
  });
}
