import Link from 'next/link';
import { Card, PageHeader, StatusBadge } from '@/components/ui';
import { listOrders } from '@/lib/supabase-data';

export default async function OrdersPage() {
  const orders = await listOrders();
  return <>
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><PageHeader title="Orders" description="Customer order intake with locked selling price snapshots." /><Link className="rounded-xl bg-ampersand-600 px-4 py-2 text-sm font-semibold text-white" href="/console/orders/new">New order</Link></div>
    <div className="space-y-3">{orders.length === 0 ? <Card>No orders yet.</Card> : orders.map((order) => <Card key={order.id}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{order.order_number}</h3><StatusBadge status={order.status} /></div><p className="text-sm text-slate-600">{order.customer_name ?? 'Customer'} • BIGO {order.bigo_id} • {order.products?.name ?? 'Product'}</p><p className="text-sm text-slate-500">Reseller: {order.resellers?.name ?? 'Direct'} • Qty {order.quantity}</p></div><div className="text-left md:text-right"><p className="font-semibold">₱{Number(order.total_price_php).toFixed(2)}</p></div></div></Card>)}</div>
  </>;
}
