-- 0006_procurement_invoice_numbers_and_documents.sql
-- Relabel procurement references to BIGO invoice numbers and keep legacy batch_number compatibility.

alter table procurement_batches
  add column if not exists invoice_number text,
  add column if not exists invoice_date date,
  add column if not exists currency currency_code not null default 'USD',
  add column if not exists invoice_storage_path text;

update procurement_batches
set
  invoice_number = coalesce(nullif(invoice_number, ''), batch_number),
  supplier_name = coalesce(nullif(supplier_name, ''), 'BIGO Technology Pte. Ltd.'),
  currency = coalesce(currency, 'USD')
where invoice_number is null
   or invoice_number = ''
   or supplier_name is null
   or supplier_name = ''
   or currency is null;

alter table procurement_batches
  alter column invoice_number set not null,
  alter column currency set not null;

create unique index if not exists procurement_batches_invoice_number_key on procurement_batches(invoice_number);
create index if not exists idx_procurement_invoice_date on procurement_batches(invoice_date);
create index if not exists idx_procurement_invoice_storage_path on procurement_batches(invoice_storage_path);

alter table procurement_batches
  drop constraint if exists procurement_invoice_attachment_required;

alter table procurement_batches
  add constraint procurement_invoice_attachment_required
  check (status not in ('confirmed_by_bigo', 'balance_replenished') or invoice_storage_path is not null)
  not valid;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'procurement-documents',
  'procurement-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin finance read procurement documents" on storage.objects;
drop policy if exists "admin finance insert procurement documents" on storage.objects;
drop policy if exists "admin finance update procurement documents" on storage.objects;
drop policy if exists "admin finance delete procurement documents" on storage.objects;

create policy "admin finance read procurement documents" on storage.objects
  for select using (
    bucket_id = 'procurement-documents'
    and public.current_user_role() in ('admin', 'finance')
  );

create policy "admin finance insert procurement documents" on storage.objects
  for insert with check (
    bucket_id = 'procurement-documents'
    and public.current_user_role() in ('admin', 'finance')
  );

create policy "admin finance update procurement documents" on storage.objects
  for update using (
    bucket_id = 'procurement-documents'
    and public.current_user_role() in ('admin', 'finance')
  ) with check (
    bucket_id = 'procurement-documents'
    and public.current_user_role() in ('admin', 'finance')
  );

create policy "admin finance delete procurement documents" on storage.objects
  for delete using (
    bucket_id = 'procurement-documents'
    and public.current_user_role() in ('admin', 'finance')
  );
