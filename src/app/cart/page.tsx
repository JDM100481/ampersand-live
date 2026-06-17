import Link from 'next/link';
import { StorefrontCart } from '@/components/storefront-cart';

export default function CartPage() {
  return <main className="min-h-screen bg-slate-50"><section className="mx-auto max-w-4xl px-4 py-10"><nav className="mb-8 flex items-center justify-between"><Link className="font-black text-slate-950" href="/">Ampersand LIVE</Link><Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/">Continue shopping</Link></nav><h1 className="mb-6 text-3xl font-black text-slate-950">Your cart</h1><StorefrontCart /></section></main>;
}
