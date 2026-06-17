-- 0007_public_storefront.sql
-- Public storefront catalog reads, order intake, payment records, and payment proof uploads.

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "public can view active products" on products;
create policy "public can view active products" on products
  for select using (is_active = true);

drop policy if exists "public can create storefront orders" on orders;
create policy "public can create storefront orders" on orders
  for insert with check (
    source = 'storefront'
    and status = 'payment_submitted'
    and reseller_id is null
    and unit_cost_usd = 0
    and total_cost_usd = 0
    and total_cost_php = 0
    and commission_amount_php = 0
  );

drop policy if exists "public can create storefront payments" on payments;
create policy "public can create storefront payments" on payments
  for insert with check (
    status = 'submitted'
    and proof_storage_path like 'storefront/%'
  );

drop policy if exists "public can upload storefront payment-proofs" on storage.objects;
create policy "public can upload storefront payment-proofs" on storage.objects
  for insert with check (
    bucket_id = 'payment-proofs'
    and name like 'storefront/%'
  );

-- Internal admin users keep visibility/management of all storefront-created rows through existing admin policies.
