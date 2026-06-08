import clsx from 'clsx';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-2xl border border-slate-200 bg-white p-5 shadow-soft', className)}>{children}</div>;
}

export function PageHeader({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-600">{description}</p></div>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status.includes('verified') || status === 'fulfilled' || status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : status.includes('reject') || status === 'inactive' || status === 'suspended' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', tone)}>{status.replaceAll('_', ' ')}</span>;
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return <button className="rounded-xl bg-ampersand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ampersand-700" type="submit">{children}</button>;
}
