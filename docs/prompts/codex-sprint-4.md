# Codex Implementation Prompt — Sprint 4

You are implementing Sprint 4 for Ampersand LIVE Console.

## Mission

Implement Procurement, BIGO Singapore settlement tracking, USD Inventory, Treasury, dashboard KPIs, CSV exports, full tests, and the official BIGO Diamond product catalog seed/import.

## Hard Constraints

- Work in the existing codebase. Do not redesign existing modules.
- Existing working modules must remain working:
  - Authentication
  - Supabase connection
  - RLS policies
  - Products
  - Resellers
  - Orders
  - Payment verification
  - Fulfillment
  - Dashboard
  - Existing inventory movement creation from fulfillment
  - Existing treasury movement creation from payment verification
  - Existing profit calculations
- Use the existing schema whenever possible.
- Do not add destructive migrations.
- Keep manual-first MVP UX: simple mobile-first forms, cards/tables, explicit status actions.
- Preserve order financial snapshot logic.
- Verify with real tests/builds before finishing.

## Current Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase
- Vitest

## Current Important Files

- `src/lib/actions.ts` — existing server actions
- `src/lib/supabase-data.ts` — server-side query helpers and dashboard metrics
- `src/components/app-shell.tsx` — console navigation
- `src/app/(console)/dashboard/page.tsx`
- `src/app/(console)/products/page.tsx`
- `src/app/(console)/orders/new/page.tsx`
- `src/app/(console)/payments/page.tsx`
- `src/app/(console)/fulfillment/page.tsx`
- `src/features/procurement/procurement-status.ts`
- `src/features/inventory/inventory-ledger.ts`
- `src/features/orders/order-financials.ts`
- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_admin_rls_policies.sql`
- `tests/inventory-procurement-permissions.test.ts`
- `tests/financials.test.ts`

## Existing Schema to Use

Use these existing tables:

- `products`
- `orders`
- `payments`
- `fulfillments`
- `procurement_batches`
- `inventory_movements`
- `treasury_accounts`
- `treasury_movements`

Do not redesign tables. Add only the catalog seed migration unless absolutely necessary.

## Implement These Requirements

### 1. Procurement invoice creation

Add `/procurement` route.

Add server action `createProcurementBatch(formData)` in `src/lib/actions.ts`.

Fields:

- `usd_amount` required
- `fx_rate_usd_php` required
- `bank_fees_php` optional, default 0
- `invoice_storage_path` optional
- `expected_replenishment_date` optional
- `notes` optional

Behavior:

- Use `invoice_number` as the primary BIGO procurement reference and keep `batch_number` populated for legacy compatibility.
- Insert into `procurement_batches` with supplier `BIGO Technology Pte. Ltd.`, currency `USD`, status `planned`.
- Compute `php_equivalent = usd_amount * fx_rate_usd_php + bank_fees_php`, rounded to 2 decimals.
- Revalidate `/procurement`, `/inventory`, `/dashboard`.

### 2. BIGO Singapore settlement tracking

Add server action `updateProcurementStatus(formData)`.

Use the existing procurement status helper. Valid path:

- `planned`
- `invoice_received`
- `usd_sent`
- `confirmed_by_bigo`
- `balance_replenished`
- `cancelled`

Capture:

- `settlement_reference`
- `settlement_date`
- `replenished_usd_amount`
- `confirmed_at`

When transitioning from `confirmed_by_bigo` to `balance_replenished`:

- Insert exactly one `inventory_movements` row.
- `movement_type = procurement_in`
- `amount_usd = replenished_usd_amount || usd_amount`
- `source_type = procurement`
- `source_id = procurement_batches.id`
- notes should reference invoice number and settlement reference.
- Prevent duplicate movement for the same procurement invoice by checking existing source row first.

### 3. USD inventory ledger view

Add `/inventory` route.

Add query helpers in `src/lib/supabase-data.ts`:

- `listInventoryMovements()`
- `getInventoryBalanceUsd()`
- inventory KPI aggregate helper if useful

UI:

- Current inventory balance widget in USD.
- Inbound procurement total.
- Order consumption total.
- Movement count.
- Signed ledger with date, movement type, amount USD, source type/source id, notes.
- CSV export button.

### 4. Treasury account management

Add `/treasury` route.

Add server actions:

- `createTreasuryAccount(formData)`
- `archiveTreasuryAccount(formData)`

Fields:

- `name`
- `account_type`: `gcash`, `maya`, `bank`, `cash`, `usd_settlement`, `other`
- `currency`: `PHP`, `USD`
- `notes`

Behavior:

- Active accounts appear in payment verification account dropdown.
- Archive sets `is_active = false`.
- Revalidate `/treasury`, `/payments`, `/dashboard`.

### 5. Treasury movement ledger

Add server action `createTreasuryMovement(formData)`.

Fields:

- `treasury_account_id`
- `movement_type`
- `currency`
- `amount`
- `source_type`, default `manual`
- `fx_rate_usd_php` optional
- `reference_number` optional
- `movement_date` optional
- `notes` optional

UI:

- Account balances by account/currency.
- Treasury ledger showing date, account, movement type, signed amount, reference, notes.
- CSV export button.

### 6. Dashboard inventory KPIs

Expand dashboard metrics and cards:

- Current USD Inventory Balance
- Pending Procurement USD
- Pending Procurement Invoices
- Inventory Movements

Keep existing dashboard cards.

### 7. Dashboard treasury KPIs

Expand dashboard metrics and cards:

- Treasury PHP Balance
- Treasury USD Balance
- Treasury Movements
- Active Treasury Accounts

Balances are sums of `treasury_movements.amount` grouped by currency.

### 8. CSV exports

Add CSV utility and route handlers.

Create:

- `src/lib/csv.ts`
- `src/app/(console)/exports/procurement/route.ts`
- `src/app/(console)/exports/inventory/route.ts`
- `src/app/(console)/exports/treasury/route.ts`
- `src/app/(console)/exports/products/route.ts`

Requirements:

- Escape commas, quotes, newlines, nulls.
- Return `text/csv; charset=utf-8`.
- Use attachment filenames:
  - `procurement-batches.csv`
  - `inventory-movements.csv`
  - `treasury-movements.csv`
  - `bigo-products.csv`

### 9. Official BIGO Diamond product catalog seed/import

Create `supabase/migrations/0003_bigo_diamond_catalog_seed.sql`.

Because current `products.bigo_sku` does not have a unique constraint, make the migration idempotent with a `DO $$` block that updates by `bigo_sku` when present and inserts when missing.

Use:

- `name = 'BIGO {diamonds} Diamonds'`
- `bigo_sku = 'BIGO-DIAMONDS-{diamonds}'`
- `diamond_amount = diamonds`
- `unit_price_php = listed price`
- `unit_cost_usd = 0` unless real USD wholesale cost is available
- `is_active = true`

Catalog:

```text
50 Diamonds = ₱54
100 Diamonds = ₱107
150 Diamonds = ₱160
200 Diamonds = ₱215
250 Diamonds = ₱268
300 Diamonds = ₱320
350 Diamonds = ₱375
400 Diamonds = ₱428
450 Diamonds = ₱480
500 Diamonds = ₱535
550 Diamonds = ₱588
600 Diamonds = ₱642
650 Diamonds = ₱695
700 Diamonds = ₱749
750 Diamonds = ₱802
800 Diamonds = ₱856
850 Diamonds = ₱910
900 Diamonds = ₱963
1000 Diamonds = ₱1060
1500 Diamonds = ₱1590
2000 Diamonds = ₱2120
2500 Diamonds = ₱2650
3000 Diamonds = ₱3180
3500 Diamonds = ₱3710
4000 Diamonds = ₱4240
4500 Diamonds = ₱4770
5000 Diamonds = ₱5250
5500 Diamonds = ₱5775
6000 Diamonds = ₱6300
6500 Diamonds = ₱6825
7000 Diamonds = ₱7350
7500 Diamonds = ₱7875
8000 Diamonds = ₱8400
8500 Diamonds = ₱8925
9000 Diamonds = ₱9450
10000 Diamonds = ₱10400
20000 Diamonds = ₱20800
30000 Diamonds = ₱31200
40000 Diamonds = ₱41600
50000 Diamonds = ₱51000
```

### 10. Customer ordering flow verification

Verify current order flow supports:

1. Customer/order operator selects package from catalog.
2. Customer enters BIGO ID.
3. Customer uploads payment proof or enters proof storage path using existing payment flow.
4. Customer/order operator submits order.
5. System auto-populates package price in UI.
6. System snapshots product price, USD cost, FX, commission, and gross profit.
7. System queues payment verification.
8. System queues manual fulfillment after payment verification.

If `/orders/new` does not show selected package price, add a small client component or server-rendered product summary that makes price clear. Do not rewrite the order architecture.

## Tests Required

Add/extend Vitest coverage for:

- Procurement status transitions and replenishment movement creation rules.
- Inventory balance aggregation.
- Treasury balance aggregation.
- CSV escaping and headers.
- BIGO catalog row count and exact price map.
- Order snapshot remains based on selected product price/cost/FX/commission.

Run:

```bash
npm run test
npm run typecheck
npm run build
```

If any command fails, fix the code and rerun. Do not stop after partial implementation.

## Acceptance Criteria

- `/procurement` works for batch creation and status tracking.
- BIGO settlement tracking records settlement reference/date.
- Replenishment creates one positive USD inventory movement.
- `/inventory` shows current balance and signed ledger.
- `/treasury` supports accounts, movements, balances, and ledger.
- Dashboard shows inventory and treasury KPI cards in addition to existing cards.
- CSV exports work for products, procurement, inventory, and treasury.
- Official BIGO catalog seed/import is idempotent and complete.
- Existing modules remain functional.
- `npm run test`, `npm run typecheck`, and `npm run build` pass.

## Final Response Format

When done, report:

1. Files changed.
2. Database migration(s) added.
3. Tests/build commands run with actual results.
4. Any known limitations or follow-ups.
