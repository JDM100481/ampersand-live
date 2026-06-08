import { Card, PageHeader, StatusBadge, SubmitButton } from '@/components/ui';
import { fulfillOrder } from '@/lib/actions';
import { listFulfillmentQueue } from '@/lib/supabase-data';

export default async function FulfillmentPage() {
  const queue = await listFulfillmentQueue();
  return <>
    <PageHeader title="Manual Fulfillment" description="Only payment-verified orders appear here. Fulfill manually in BIGO Reseller Portal, then record the BIGO reference." />
    <div className="space-y-4">{queue.length === 0 ? <Card>No verified orders waiting for fulfillment.</Card> : queue.map((order) => <Card key={order.id}><div className="grid gap-4 lg:grid-cols-[1fr_380px]"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{order.order_number}</h3><StatusBadge status={order.status} /></div><p className="mt-1 text-sm text-slate-600">Customer: {order.customer_name ?? '—'} • BIGO {order.bigo_id}</p><p className="text-sm text-slate-600">Product: {order.products?.name ?? '—'} • Qty {order.quantity} • Reseller {order.resellers?.name ?? 'Direct'}</p><p className="mt-2 font-semibold">Revenue ₱{Number(order.total_price_php).toFixed(2)} • USD cost ${Number(order.total_cost_usd).toFixed(2)}</p></div><form action={fulfillOrder} className="space-y-3"><input name="order_id" type="hidden" value={order.id} /><div><label>BIGO reference</label><input name="bigo_reference" required /></div><div><label>Fulfillment notes</label><input name="notes" /></div><label className="flex items-center gap-2"><input className="w-auto" name="confirmed" required type="checkbox" /> I manually fulfilled this order in the BIGO Reseller Portal.</label><SubmitButton>Mark fulfilled</SubmitButton></form></div></Card>)}</div>
  </>;
}
