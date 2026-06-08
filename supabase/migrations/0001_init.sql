-- 0001_init.sql
-- Ampersand LIVE Console - initial schema migration.
-- Manual-first BIGO reseller commerce operating system.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type app_role as enum ('admin', 'ops', 'finance', 'reseller_manager', 'reseller');
create type currency_code as enum ('PHP', 'USD');

create type order_status as enum (
  'draft', 'awaiting_payment', 'payment_submitted', 'payment_verified',
  'queued_for_fulfillment', 'fulfilled', 'cancelled', 'refunded', 'payment_rejected'
);
create type payment_status as enum ('submitted', 'needs_review', 'verified', 'rejected');
create type fulfillment_status as enum ('pending', 'completed', 'failed', 'reversed');
create type procurement_status as enum (
  'planned', 'invoice_received', 'usd_sent', 'confirmed_by_bigo', 'balance_replenished', 'cancelled'
);
create type inventory_movement_type as enum (
  'procurement_in', 'order_consumption', 'adjustment', 'reversal'
);
create type treasury_movement_type as enum (
  'customer_payment_in', 'usd_purchase_out', 'fee', 'refund', 'reseller_payout', 'adjustment'
);

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table resellers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  commission_type text not null default 'percentage'
    check (commission_type in ('percentage', 'fixed')),
  commission_rate numeric(18,4) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null default 'ops',
  reseller_id uuid references resellers(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  bigo_sku text,
  diamond_amount integer,
  unit_cost_usd numeric(18,2) not null check (unit_cost_usd >= 0),
  unit_price_php numeric(18,2) not null check (unit_price_php >= 0),
  is_active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  display_name text,
  phone text,
  email text,
  bigo_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  customer_id uuid references customers(id),
  customer_name text,
  customer_contact text,
  bigo_id text not null,
  product_id uuid not null references products(id),
  reseller_id uuid references resellers(id),
  quantity integer not null default 1 check (quantity > 0),
  status order_status not null default 'awaiting_payment',
  unit_price_php numeric(18,2) not null check (unit_price_php >= 0),
  total_price_php numeric(18,2) not null check (total_price_php >= 0),
  unit_cost_usd numeric(18,2) not null check (unit_cost_usd >= 0),
  total_cost_usd numeric(18,2) not null check (total_cost_usd >= 0),
  fx_rate_usd_php numeric(18,6) not null check (fx_rate_usd_php > 0),
  total_cost_php numeric(18,2) not null check (total_cost_php >= 0),
  commission_rate numeric(18,4) not null default 0,
  commission_amount_php numeric(18,2) not null default 0,
  gross_profit_php numeric(18,2)
    generated always as (total_price_php - total_cost_php - commission_amount_php) stored,
  source text not null default 'manual',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  cancelled_at timestamptz
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status payment_status not null default 'submitted',
  method text not null,
  amount_php numeric(18,2) not null check (amount_php >= 0),
  reference_number text,
  proof_storage_path text,
  received_at timestamptz,
  submitted_by uuid references profiles(id),
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fulfillments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status fulfillment_status not null default 'pending',
  bigo_reference text,
  fulfilled_quantity integer not null default 0 check (fulfilled_quantity >= 0),
  proof_storage_path text,
  fulfilled_by uuid references profiles(id),
  fulfilled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table procurement_batches (
  id uuid primary key default uuid_generate_v4(),
  batch_number text not null unique,
  supplier_name text not null default 'BIGO Singapore',
  status procurement_status not null default 'planned',
  usd_amount numeric(18,2) not null check (usd_amount >= 0),
  fx_rate_usd_php numeric(18,6) not null check (fx_rate_usd_php > 0),
  php_equivalent numeric(18,2) not null check (php_equivalent >= 0),
  bank_fees_php numeric(18,2) not null default 0,
  invoice_storage_path text,
  settlement_reference text,
  settlement_date date,
  expected_replenishment_date date,
  replenished_usd_amount numeric(18,2),
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  movement_type inventory_movement_type not null,
  amount_usd numeric(18,2) not null,
  source_type text not null,
  source_id uuid,
  balance_after_usd numeric(18,2),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table treasury_accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  account_type text not null
    check (account_type in ('gcash', 'maya', 'bank', 'cash', 'usd_settlement', 'other')),
  currency currency_code not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table treasury_movements (
  id uuid primary key default uuid_generate_v4(),
  treasury_account_id uuid not null references treasury_accounts(id),
  movement_type treasury_movement_type not null,
  currency currency_code not null,
  amount numeric(18,2) not null,
  fx_rate_usd_php numeric(18,6),
  source_type text not null,
  source_id uuid,
  reference_number text,
  movement_date date not null default current_date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table reseller_commissions (
  id uuid primary key default uuid_generate_v4(),
  reseller_id uuid not null references resellers(id),
  order_id uuid not null references orders(id),
  amount_php numeric(18,2) not null check (amount_php >= 0),
  status text not null default 'payable'
    check (status in ('payable', 'paid', 'void')),
  paid_at timestamptz,
  treasury_movement_id uuid references treasury_movements(id),
  created_at timestamptz not null default now(),
  unique (order_id)
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_orders_status on orders(status);
create index idx_orders_reseller on orders(reseller_id);
create index idx_orders_created_at on orders(created_at);
create index idx_payments_order on payments(order_id);
create index idx_payments_status on payments(status);
create index idx_fulfillments_order on fulfillments(order_id);
create index idx_procurement_status on procurement_batches(status);
create index idx_inventory_created_at on inventory_movements(created_at);
create index idx_treasury_account_date on treasury_movements(treasury_account_id, movement_date);
create index idx_audit_entity on audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Row level security (baseline; tighten per-table before live launch)
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table resellers enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table fulfillments enable row level security;
alter table procurement_batches enable row level security;
alter table inventory_movements enable row level security;
alter table treasury_accounts enable row level security;
alter table treasury_movements enable row level security;
alter table reseller_commissions enable row level security;
alter table audit_logs enable row level security;

create or replace function public.current_user_role()
returns app_role
language sql
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create policy "users can read own profile" on profiles
  for select using (id = auth.uid());

create policy "admins can manage profiles" on profiles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "authenticated users can view products" on products
  for select using (auth.uid() is not null);

create policy "admins can manage products" on products
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- NOTE: Phase 8 (hardening) must add tighter per-table policies for orders,
-- payments, fulfillments, procurement, treasury, inventory, and commissions
-- (e.g. resellers see only their own orders; finance-only writes on treasury).
