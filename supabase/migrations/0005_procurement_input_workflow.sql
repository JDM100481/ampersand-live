-- 0005_procurement_input_workflow.sql
-- Procurement Input workflow: landed PHP cost, Dias cost basis, and treasury outflow.

alter type treasury_movement_type add value if not exists 'procurement_out';

alter table procurement_batches
  add column if not exists other_fees_php numeric(18,2) not null default 0 check (other_fees_php >= 0),
  add column if not exists total_landed_php_cost numeric(18,2) not null default 0 check (total_landed_php_cost >= 0),
  add column if not exists cost_per_dias_php numeric(18,6) not null default 0 check (cost_per_dias_php >= 0);

update procurement_batches
set
  other_fees_php = coalesce(other_fees_php, 0),
  total_landed_php_cost = case
    when coalesce(total_landed_php_cost, 0) > 0 then total_landed_php_cost
    else coalesce(php_equivalent, 0) + coalesce(bank_fees_php, 0) + coalesce(other_fees_php, 0)
  end,
  cost_per_dias_php = case
    when coalesce(cost_per_dias_php, 0) > 0 then cost_per_dias_php
    when coalesce(dias_received, 0) > 0 then (coalesce(php_equivalent, 0) + coalesce(bank_fees_php, 0) + coalesce(other_fees_php, 0)) / dias_received
    else 0
  end;

alter table inventory_movements
  alter column amount_usd drop not null;

create index if not exists idx_treasury_movements_type_date on treasury_movements(movement_type, movement_date);

-- Admin/finance can manage finance-sensitive procurement, inventory, and treasury records.
drop policy if exists "admins can manage procurement batches" on procurement_batches;
create policy "admin finance manage procurement batches" on procurement_batches
  for all using (public.current_user_role() in ('admin', 'finance'))
  with check (public.current_user_role() in ('admin', 'finance'));

drop policy if exists "admins can manage inventory movements" on inventory_movements;
create policy "admin finance manage inventory movements" on inventory_movements
  for all using (public.current_user_role() in ('admin', 'finance'))
  with check (public.current_user_role() in ('admin', 'finance'));

drop policy if exists "admins can manage treasury accounts" on treasury_accounts;
create policy "admin finance manage treasury accounts" on treasury_accounts
  for all using (public.current_user_role() in ('admin', 'finance'))
  with check (public.current_user_role() in ('admin', 'finance'));

drop policy if exists "admins can manage treasury movements" on treasury_movements;
create policy "admin finance manage treasury movements" on treasury_movements
  for all using (public.current_user_role() in ('admin', 'finance'))
  with check (public.current_user_role() in ('admin', 'finance'));
