import Link from 'next/link';
import { signOut } from '@/lib/actions';

const nav: Array<readonly [string, string]> = [
  ['Dashboard', '/console/dashboard'], ['Products', '/console/products'], ['Resellers', '/console/resellers'], ['Orders', '/console/orders'], ['Payments', '/console/payments'], ['Fulfillment', '/console/fulfillment'], ['Procurement', '/console/procurement'], ['Reports', '/console/reports']
];

export function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string | null }) {
  return <div className="min-h-screen bg-slate-50">
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div><Link className="text-lg font-black text-slate-950" href="/console/dashboard">Ampersand LIVE Console</Link><p className="text-xs text-slate-500">Internal admin and finance workspace</p></div>
        <nav className="flex flex-wrap gap-2">{nav.map(([label, href]) => <Link className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-ampersand-100" href={href} key={href}>{label}</Link>)}</nav>
        <form action={signOut} className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 md:block">{userEmail ?? 'local preview'}</span><button className="rounded-full border border-slate-300 px-3 py-1.5 text-sm" type="submit">Sign out</button></form>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>;
}
