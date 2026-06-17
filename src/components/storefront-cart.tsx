'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SubmitButton } from './ui';

type StorefrontProduct = {
  id: string;
  name: string;
  bigo_sku: string | null;
  diamond_amount: number | null;
  unit_price_php: number;
};

type CartItem = StorefrontProduct & { quantity: number };

const CART_KEY = 'ampersand-live-cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(CART_KEY) ?? '[]') as CartItem[]; } catch { return []; }
}

function saveCart(items: CartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('ampersand-live-cart'));
}

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function dias(value: number | null) { return (value ?? 0).toLocaleString('en-PH'); }

export function StorefrontCatalog({ products }: { products: StorefrontProduct[] }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => setItems(loadCart()), []);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  function add(product: StorefrontProduct) {
    const next = [...items];
    const existing = next.find((item) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else next.push({ ...product, quantity: 1 });
    setItems(next);
    saveCart(next);
  }

  return <>
    <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-600">{itemCount} item{itemCount === 1 ? '' : 's'} in cart</p><Link className="rounded-xl bg-ampersand-600 px-4 py-2 text-sm font-semibold text-white" href="/cart">View cart</Link></div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft" key={product.id}><p className="text-xs font-semibold uppercase tracking-wide text-ampersand-600">BIGO Dias</p><h2 className="mt-2 text-xl font-bold text-slate-950">{product.name}</h2><p className="mt-2 text-sm text-slate-500">{dias(product.diamond_amount)} Dias • SKU {product.bigo_sku ?? '—'}</p><p className="mt-4 text-3xl font-black text-slate-950">{money(Number(product.unit_price_php))}</p><button className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => add(product)} type="button">Add to cart</button></div>)}</div>
  </>;
}

export function StorefrontCart({ checkout = false }: { checkout?: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const refresh = () => setItems(loadCart());
    refresh();
    window.addEventListener('ampersand-live-cart', refresh);
    return () => window.removeEventListener('ampersand-live-cart', refresh);
  }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.unit_price_php) * item.quantity, 0), [items]);

  function update(productId: string, quantity: number) {
    const next = items.map((item) => item.id === productId ? { ...item, quantity } : item).filter((item) => item.quantity > 0);
    setItems(next);
    saveCart(next);
  }

  if (items.length === 0) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-soft"><p className="text-slate-600">Your cart is empty.</p><Link className="mt-4 inline-flex rounded-xl bg-ampersand-600 px-4 py-2 text-sm font-semibold text-white" href="/">Shop packages</Link></div>;

  return <div className="space-y-4">
    {items.map((item) => <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between" key={item.id}><div><h2 className="font-semibold text-slate-950">{item.name}</h2><p className="text-sm text-slate-500">{dias(item.diamond_amount)} Dias • {money(Number(item.unit_price_php))}</p></div><div className="flex items-center gap-3"><input aria-label={`Quantity for ${item.name}`} className="w-24" min="0" onChange={(event) => update(item.id, Number(event.target.value))} type="number" value={item.quantity} /><p className="w-28 text-right font-semibold">{money(Number(item.unit_price_php) * item.quantity)}</p></div></div>)}
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm"><p className="text-sm text-slate-500">Total due</p><p className="text-3xl font-black text-slate-950">{money(total)}</p>{checkout ? null : <Link className="mt-4 inline-flex rounded-xl bg-ampersand-600 px-4 py-2 text-sm font-semibold text-white" href="/checkout">Checkout</Link>}</div>
  </div>;
}

export function CheckoutCartFields() {
  const [cart, setCart] = useState('[]');
  useEffect(() => setCart(JSON.stringify(loadCart())), []);
  return <input name="cart_items" type="hidden" value={cart} />;
}

export function ClearCartNotice() {
  useEffect(() => { window.localStorage.removeItem(CART_KEY); window.dispatchEvent(new Event('ampersand-live-cart')); }, []);
  return null;
}

export function CheckoutSubmitButton() {
  return <SubmitButton>Submit order and payment proof</SubmitButton>;
}
