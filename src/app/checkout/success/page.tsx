import Link from 'next/link';
import { ClearCartNotice } from '@/components/storefront-cart';

export default function CheckoutSuccessPage() {
  return <main className="min-h-screen bg-slate-50"><ClearCartNotice /><section className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10"><div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-soft"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">Order submitted</p><h1 className="mt-3 text-3xl font-black text-slate-950">Thanks — we received your order and payment proof.</h1><p className="mt-4 text-slate-600">The Ampersand LIVE team will verify your payment and fulfill your BIGO Dias order manually.</p><Link className="mt-6 inline-flex rounded-xl bg-ampersand-600 px-4 py-2 text-sm font-semibold text-white" href="/">Back to store</Link></div></section></main>;
}
