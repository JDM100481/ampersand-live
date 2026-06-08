-- 0002_admin_rls_policies.sql
-- Ampersand LIVE Console - MVP admin policies for live app smoke testing.
-- Run after 0001_init.sql. Keeps RLS enabled while allowing admin profile users
-- to operate the internal console through anon/authenticated Supabase clients.

-- Resellers
drop policy if exists "admins can manage resellers" on resellers;
create policy "admins can manage resellers" on resellers
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Customers
drop policy if exists "admins can manage customers" on customers;
create policy "admins can manage customers" on customers
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Orders
drop policy if exists "admins can manage orders" on orders;
create policy "admins can manage orders" on orders
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Payments
drop policy if exists "admins can manage payments" on payments;
create policy "admins can manage payments" on payments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Fulfillments
drop policy if exists "admins can manage fulfillments" on fulfillments;
create policy "admins can manage fulfillments" on fulfillments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Procurement
drop policy if exists "admins can manage procurement batches" on procurement_batches;
create policy "admins can manage procurement batches" on procurement_batches
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Inventory ledger
drop policy if exists "admins can manage inventory movements" on inventory_movements;
create policy "admins can manage inventory movements" on inventory_movements
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Treasury
drop policy if exists "admins can manage treasury accounts" on treasury_accounts;
create policy "admins can manage treasury accounts" on treasury_accounts
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "admins can manage treasury movements" on treasury_movements;
create policy "admins can manage treasury movements" on treasury_movements
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Commissions
drop policy if exists "admins can manage reseller commissions" on reseller_commissions;
create policy "admins can manage reseller commissions" on reseller_commissions
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Audit log
drop policy if exists "admins can read audit logs" on audit_logs;
create policy "admins can read audit logs" on audit_logs
  for select using (public.current_user_role() = 'admin');

drop policy if exists "admins can insert audit logs" on audit_logs;
create policy "admins can insert audit logs" on audit_logs
  for insert with check (public.current_user_role() = 'admin');
