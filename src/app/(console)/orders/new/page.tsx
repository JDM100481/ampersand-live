import { Card, PageHeader, SubmitButton } from '@/components/ui';
import { createOrder } from '@/lib/actions';
import { listProducts, listResellers } from '@/lib/supabase-data';

export default async function NewOrderPage() {
  const [products, resellers] = await Promise.all([listProducts(), listResellers()]);
  return <>
    <PageHeader title="New Order" description="Create a customer order from the active selling package catalog." />
    <Card className="max-w-3xl"><form action={createOrder} className="grid gap-4 md:grid-cols-2">
      <div><label>Customer name</label><input name="customer_name" /></div><div><label>Customer contact</label><input name="customer_contact" /></div>
      <div><label>BIGO ID</label><input name="bigo_id" required /></div><div><label>Quantity</label><input defaultValue="1" min="1" name="quantity" required type="number" /></div>
      <div><label>Product</label><select name="product_id" required><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} — ₱{Number(product.unit_price_php).toFixed(2)}</option>)}</select></div>
      <div><label>Reseller</label><select name="reseller_id"><option value="">Direct / no reseller</option>{resellers.filter((r) => r.status === 'active').map((reseller) => <option key={reseller.id} value={reseller.id}>{reseller.name}</option>)}</select></div>
      <div className="md:col-span-2"><label>Notes</label><textarea name="notes" rows={3} /></div>
      <div className="md:col-span-2"><SubmitButton>Create order</SubmitButton></div>
    </form></Card>
  </>;
}
