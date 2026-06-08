import { Card, PageHeader, StatusBadge, SubmitButton } from '@/components/ui';
import { createReseller } from '@/lib/actions';
import { listResellers } from '@/lib/supabase-data';

export default async function ResellersPage() {
  const resellers = await listResellers();
  return <>
    <PageHeader title="Resellers" description="Manage reseller profiles, status, and commission settings." />
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card><h2 className="mb-4 font-semibold">Create reseller</h2><form action={createReseller} className="space-y-4">
        <div><label>Reseller name</label><input name="name" required /></div>
        <div><label>Contact person</label><input name="contact_name" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Phone</label><input name="phone" /></div><div><label>Email</label><input name="email" type="email" /></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label>Status</label><select name="status"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></div><div><label>Commission Type</label><select name="commission_type"><option value="percentage">Percentage</option><option value="fixed">Fixed per unit</option></select></div></div>
        <div><label>Commission Rate</label><input defaultValue="0" name="commission_rate" required step="0.0001" type="number" /></div><SubmitButton>Create reseller</SubmitButton>
      </form></Card>
      <div className="space-y-3">{resellers.length === 0 ? <Card>No resellers yet.</Card> : resellers.map((reseller) => <Card key={reseller.id}><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{reseller.name}</h3><StatusBadge status={reseller.status} /></div><p className="mt-1 text-sm text-slate-600">{reseller.contact_name ?? 'No contact'} • {reseller.phone ?? reseller.email ?? 'No contact details'}</p><p className="mt-2 text-sm font-medium">Commission: {reseller.commission_type} / {Number(reseller.commission_rate).toFixed(4)}</p></Card>)}</div>
    </div>
  </>;
}
