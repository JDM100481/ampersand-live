import { Card, PageHeader, StatusBadge, SubmitButton } from '@/components/ui';
import { archiveProduct, createProduct } from '@/lib/actions';
import { listProducts } from '@/lib/supabase-data';

export default async function ProductsPage() {
  const products = await listProducts(true);
  return <>
    <PageHeader title="Products" description="Manage BIGO selling packages, PHP prices, and archive status." />
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card><h2 className="mb-4 font-semibold">Create product</h2><form action={createProduct} className="space-y-4">
        <div><label>Name</label><input name="name" required placeholder="BIGO 100 Diamonds" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>BIGO SKU</label><input name="bigo_sku" /></div><div><label>Diamonds</label><input name="diamond_amount" type="number" /></div></div>
        <div><label>PHP Price</label><input name="unit_price_php" required step="0.01" type="number" /></div>
        <label className="flex items-center gap-2"><input className="w-auto" defaultChecked name="is_active" type="checkbox" /> Active</label><SubmitButton>Create product</SubmitButton>
      </form></Card>
      <div className="space-y-3">{products.length === 0 ? <Card>No products yet.</Card> : products.map((product) => <Card key={product.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{product.name}</h3><StatusBadge status={product.is_active ? 'active' : 'inactive'} /></div><p className="text-sm text-slate-600">SKU {product.bigo_sku ?? '—'} • {product.diamond_amount ?? '—'} diamonds</p><p className="text-sm font-medium">Price ₱{Number(product.unit_price_php).toFixed(2)}</p></div>{product.is_active && <form action={archiveProduct}><input name="id" type="hidden" value={product.id} /><button className="rounded-xl border border-slate-300 px-3 py-2 text-sm" type="submit">Archive</button></form>}</Card>)}</div>
    </div>
  </>;
}
