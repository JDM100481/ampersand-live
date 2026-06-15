-- 0004_sprint_6_reports_dias_inventory.sql
-- Sprint 6: pooled Dias inventory and sales report support.
-- Products remain selling packages only; procurement batches own landed cost.

alter table procurement_batches
  add column if not exists dias_received integer not null default 0 check (dias_received >= 0);

alter table orders
  add column if not exists package_dias integer not null default 0 check (package_dias >= 0);

alter table inventory_movements
  add column if not exists amount_dias integer,
  add column if not exists balance_after_dias integer;

create index if not exists idx_procurement_created_at on procurement_batches(created_at);
create index if not exists idx_fulfillments_fulfilled_at on fulfillments(fulfilled_at);
