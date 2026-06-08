# Sprint 4 — Procurement, Inventory, Treasury, and BIGO Catalog

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement the manual-first Procurement, USD Inventory, Treasury, dashboard KPI, CSV export, and official BIGO Diamond catalog seed/import work using the existing Ampersand LIVE Console schema.

**Architecture:** Build directly on the current Next.js App Router + Supabase server-action pattern. Reuse existing tables (`procurement_batches`, `inventory_movements`, `treasury_accounts`, `treasury_movements`, `products`) and existing feature helpers (`procurement-status`, `inventory-ledger`, order financial snapshots) without redesigning working modules.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, Vitest.

---

## Scope Guardrails

- Do **not** redesign authentication, products, resellers, orders, payments, fulfillment, dashboard layout shell, or RLS.
- Keep the MVP manual-first: forms, tables, status buttons, and CSV links are enough.
- Prefer server components plus server actions, matching the existing `src/lib/actions.ts` and `src/lib/supabase-data.ts` style.
- Use existing schema first. Add only seed/import SQL for the official BIGO catalog unless implementation discovers a hard blocker.
- Preserve current ordering flow and snapshot logic: order totals must be based on the product row at order time.

---

## Sprint 4 Task List

### 1. Data access expansion

**Objective:** Add typed read models and query functions for Procurement, Inventory, Treasury, and dashboard KPIs.

**Files:**
- Modify: `src/lib/supabase-data.ts`
- Test: `tests/sprint-4-data.test.ts` or extend existing feature tests

**Work:**
- Add types:
  - `DbProcurementBatch`
  - `DbInventoryMovement`
  - `DbTreasuryMovement`
  - Expanded `DbTreasuryAccount` with `is_active`, `notes`, `created_at`
- Add reads:
  - `listProcurementBatches()` ordered newest first
  - `listInventoryMovements()` ordered newest first
  - `getInventoryBalanceUsd()` = sum `amount_usd`
  - `listTreasuryAccounts(includeInactive = false)`
  - `listTreasuryMovements()` joined to `treasury_accounts(name, currency, account_type)`
  - `getTreasuryBalances()` grouped by account/currency from movements
- Expand `dashboardMetrics()` with:
  - `inventoryBalanceUsd`
  - `inventoryMovementCount`
  - `pendingProcurementCount`
  - `pendingProcurementUsd`
  - `treasuryPhpBalance`
  - `treasuryUsdBalance`
  - `treasuryMovementCount`

**Acceptance:** Dashboard pages can read these values in safe preview mode and live Supabase mode without crashing.

---

### 2. Procurement batch creation

**Objective:** Operators can create BIGO Singapore procurement batches from the console.

**Files:**
- Modify: `src/lib/actions.ts`
- Create: `src/app/(console)/procurement/page.tsx`
- Modify: `src/components/app-shell.tsx`
- Test: `tests/procurement-actions.test.ts`

**Work:**
- Add `createProcurementBatch(formData)` server action.
- Generate batch numbers like `BIGO-YYYYMMDD-001` using count for current UTC day.
- Required fields:
  - `usd_amount`
  - `fx_rate_usd_php`
  - optional `bank_fees_php`
  - optional `invoice_storage_path`
  - optional `expected_replenishment_date`
  - optional `notes`
- Compute `php_equivalent = usd_amount * fx_rate_usd_php + bank_fees_php` rounded to 2 decimals.
- Insert into `procurement_batches` with supplier default `BIGO Singapore`, status `planned`.
- Revalidate `/procurement`, `/inventory`, `/dashboard`.
- Add `/procurement` page with mobile-first creation form and batch cards/table.

**Acceptance:** A user can create a planned procurement batch and see it immediately in the procurement list.

---

### 3. BIGO Singapore settlement tracking

**Objective:** Finance can advance procurement status and record settlement/replenishment details.

**Files:**
- Modify: `src/lib/actions.ts`
- Modify: `src/app/(console)/procurement/page.tsx`
- Test: extend `tests/inventory-procurement-permissions.test.ts`

**Work:**
- Add `updateProcurementStatus(formData)` server action.
- Use `assertProcurementTransition` / `canTransitionProcurement` from `src/features/procurement/procurement-status.ts`.
- Support status path:
  - `planned`
  - `invoice_received`
  - `usd_sent`
  - `confirmed_by_bigo`
  - `balance_replenished`
  - `cancelled`
- Capture settlement fields when status moves to or past `usd_sent`:
  - `settlement_reference`
  - `settlement_date`
- Capture replenishment fields when moving to `balance_replenished`:
  - `replenished_usd_amount` defaulting to `usd_amount`
  - `confirmed_at`
- On the `confirmed_by_bigo -> balance_replenished` transition, insert `inventory_movements` row:
  - `movement_type = procurement_in`
  - `amount_usd = replenished_usd_amount`
  - `source_type = procurement`
  - `source_id = procurement_batches.id`
  - `notes` referencing batch number and settlement reference
- Do not create duplicate inbound inventory movements for the same procurement batch. Check for existing `source_type='procurement' AND source_id=batch.id` before inserting.

**Acceptance:** Marking a confirmed BIGO batch as balance replenished creates exactly one positive USD inventory movement.

---

### 4. USD inventory ledger view and current balance widget

**Objective:** Operators can see the current BIGO reseller USD inventory balance and movement ledger.

**Files:**
- Create: `src/app/(console)/inventory/page.tsx`
- Modify: `src/lib/supabase-data.ts`
- Modify: `src/components/app-shell.tsx`
- Test: `tests/inventory-ledger-view.test.ts`

**Work:**
- Add `/inventory` route.
- Top card: current inventory balance in USD from `getInventoryBalanceUsd()`.
- KPI cards:
  - total inbound procurement USD
  - total order consumption USD
  - movement count
- Ledger table/cards showing:
  - date
  - movement type
  - signed amount USD
  - source type
  - source id or linked label when available
  - notes
- Add CSV export link/button for inventory movements.

**Acceptance:** Fulfillment-created negative movements and procurement-created positive movements both appear in a single signed ledger.

---

### 5. Treasury account management

**Objective:** Finance/admin can create and archive treasury accounts used for PHP collections and USD settlement tracking.

**Files:**
- Modify: `src/lib/actions.ts`
- Create: `src/app/(console)/treasury/page.tsx`
- Modify: `src/components/app-shell.tsx`
- Test: `tests/treasury-actions.test.ts`

**Work:**
- Add `createTreasuryAccount(formData)` server action.
- Add `archiveTreasuryAccount(formData)` server action that sets `is_active = false`.
- Fields:
  - `name`
  - `account_type` (`gcash`, `maya`, `bank`, `cash`, `usd_settlement`, `other`)
  - `currency` (`PHP`, `USD`)
  - `notes`
- Revalidate `/treasury`, `/payments`, `/dashboard`.
- Keep active accounts available to payment verification.

**Acceptance:** Created active accounts are visible on `/treasury` and payment verification can still select them.

---

### 6. Treasury movement ledger

**Objective:** Finance can manually record treasury movements and see balances by account/currency.

**Files:**
- Modify: `src/lib/actions.ts`
- Modify: `src/app/(console)/treasury/page.tsx`
- Modify: `src/lib/supabase-data.ts`
- Test: `tests/treasury-ledger.test.ts`

**Work:**
- Add `createTreasuryMovement(formData)` server action.
- Required fields:
  - `treasury_account_id`
  - `movement_type`
  - `currency`
  - `amount`
  - `source_type` defaulting to `manual`
  - optional `fx_rate_usd_php`
  - optional `reference_number`
  - optional `movement_date`
  - optional `notes`
- Preserve sign convention in UI copy:
  - money in = positive amount
  - money out / settlement = negative amount
- Ledger view shows date, account, movement type, currency, signed amount, reference, notes.
- Add CSV export link/button for treasury movements.

**Acceptance:** Payment verification-created PHP movements and manual movements appear in one treasury ledger with balances.

---

### 7. Dashboard inventory KPIs

**Objective:** Dashboard shows operational inventory health without changing existing dashboard cards.

**Files:**
- Modify: `src/lib/supabase-data.ts`
- Modify: `src/app/(console)/dashboard/page.tsx`

**Work:**
- Add inventory KPI cards:
  - Current USD Inventory Balance
  - Pending Procurement USD
  - Pending Procurement Batches
  - Inventory Movements
- Keep existing dashboard metrics intact.

**Acceptance:** Dashboard renders both current cards and new inventory cards.

---

### 8. Dashboard treasury KPIs

**Objective:** Dashboard shows current PHP and USD treasury positions.

**Files:**
- Modify: `src/lib/supabase-data.ts`
- Modify: `src/app/(console)/dashboard/page.tsx`

**Work:**
- Add treasury KPI cards:
  - Treasury PHP Balance
  - Treasury USD Balance
  - Treasury Movements
  - Active Treasury Accounts
- Keep values signed and numeric-safe.

**Acceptance:** Dashboard does not double-count accounts; balances are sums of movement amounts by currency.

---

### 9. CSV exports

**Objective:** Operators can export procurement, inventory, treasury, and products data as CSV.

**Files:**
- Create: `src/lib/csv.ts`
- Create: `src/app/(console)/exports/procurement/route.ts`
- Create: `src/app/(console)/exports/inventory/route.ts`
- Create: `src/app/(console)/exports/treasury/route.ts`
- Create: `src/app/(console)/exports/products/route.ts`
- Link from relevant pages.
- Test: `tests/csv.test.ts`

**Work:**
- Implement CSV escaping utility covering commas, quotes, CRLF, nulls.
- Route handlers return `text/csv; charset=utf-8` and attachment filenames:
  - `procurement-batches.csv`
  - `inventory-movements.csv`
  - `treasury-movements.csv`
  - `bigo-products.csv`
- Use Supabase server client and safe fallbacks where practical.

**Acceptance:** CSV output has correct headers, escaped values, and current data rows.

---

### 10. Official BIGO Diamond catalog seed/import

**Objective:** Seed/import the official BIGO Diamond product catalog and make ordering auto-populate package price.

**Files:**
- Create: `supabase/migrations/0003_bigo_diamond_catalog_seed.sql`
- Create or modify: `scripts/import-bigo-products.ts` if a script-based import is preferred
- Modify: `src/app/(console)/products/page.tsx`
- Modify: `src/app/(console)/orders/new/page.tsx`
- Test: `tests/bigo-catalog.test.ts`

**Catalog rows:** Use the official list in the Codex prompt below.

**Work:**
- Seed product rows with:
  - `name = 'BIGO {diamonds} Diamonds'`
  - `bigo_sku = 'BIGO-DIAMONDS-{diamonds}'`
  - `diamond_amount = diamonds`
  - `unit_price_php = listed price`
  - `unit_cost_usd = 0` initially unless real wholesale USD cost is available from BIGO Singapore procurement data
  - `is_active = true`
- Implement as idempotent SQL using `DO $$ ... IF EXISTS UPDATE ELSE INSERT ... END IF;` because current `products.bigo_sku` has no unique constraint.
- Do not add a uniqueness constraint unless explicitly approved later.
- Product page should show an import/seed status or note after migration.
- Orders/new should clearly display selected package price and submit `quantity=1` by default for customer package purchases.
- Existing order action already snapshots unit price, USD cost, FX, commission, and gross profit; verify it remains intact.

**Acceptance:** All 40 official BIGO Diamond packages exist as active products and can be selected for orders.

---

## Database Changes If Needed

No structural schema change is required for Sprint 4. The current schema already includes:

- `procurement_batches`
- `inventory_movements`
- `treasury_accounts`
- `treasury_movements`
- product financial snapshot fields on `orders`

Required database artifact:

- Add idempotent seed/import SQL at `supabase/migrations/0003_bigo_diamond_catalog_seed.sql` for the official BIGO Diamond product catalog.

Optional only if implementation later proves it necessary:

- Add a non-breaking index on `products(bigo_sku)` for catalog lookup speed.
- Do **not** add a unique constraint on `bigo_sku` in Sprint 4 without explicit approval, because existing data may already contain duplicate/manual product SKUs.

---

## Official BIGO Diamond Product Catalog

| Diamonds | PHP Price |
|---:|---:|
| 50 | ₱54 |
| 100 | ₱107 |
| 150 | ₱160 |
| 200 | ₱215 |
| 250 | ₱268 |
| 300 | ₱320 |
| 350 | ₱375 |
| 400 | ₱428 |
| 450 | ₱480 |
| 500 | ₱535 |
| 550 | ₱588 |
| 600 | ₱642 |
| 650 | ₱695 |
| 700 | ₱749 |
| 750 | ₱802 |
| 800 | ₱856 |
| 850 | ₱910 |
| 900 | ₱963 |
| 1000 | ₱1060 |
| 1500 | ₱1590 |
| 2000 | ₱2120 |
| 2500 | ₱2650 |
| 3000 | ₱3180 |
| 3500 | ₱3710 |
| 4000 | ₱4240 |
| 4500 | ₱4770 |
| 5000 | ₱5250 |
| 5500 | ₱5775 |
| 6000 | ₱6300 |
| 6500 | ₱6825 |
| 7000 | ₱7350 |
| 7500 | ₱7875 |
| 8000 | ₱8400 |
| 8500 | ₱8925 |
| 9000 | ₱9450 |
| 10000 | ₱10400 |
| 20000 | ₱20800 |
| 30000 | ₱31200 |
| 40000 | ₱41600 |
| 50000 | ₱51000 |

---

## Customer Ordering Flow Acceptance

1. Customer/order operator selects package from catalog.
2. Package price is visible before submit.
3. Customer BIGO ID is required.
4. Payment proof can be submitted using the existing payment form/storage path field.
5. Order submit snapshots:
   - product PHP price
   - product USD cost
   - FX rate
   - reseller commission rate
   - gross profit via existing generated column
6. New order enters `awaiting_payment`.
7. Payment submission moves order to `payment_submitted` and queues payment verification.
8. Payment verification moves order to `queued_for_fulfillment` and can create a treasury movement.
9. Manual fulfillment creates a negative USD inventory movement.
10. Procurement replenishment creates a positive USD inventory movement.

---

## Full Acceptance Criteria

- `/procurement` exists and supports batch creation/status tracking.
- BIGO settlement reference/date can be recorded.
- Transition to `balance_replenished` creates exactly one positive inventory ledger row.
- `/inventory` exists and shows current USD balance plus ledger.
- `/treasury` exists and supports account creation/archive plus manual movements.
- Treasury ledger includes payment-created and manual movements.
- Dashboard keeps existing cards and adds inventory/treasury KPIs.
- CSV exports exist for products, procurement, inventory, and treasury.
- Official BIGO catalog is seeded/imported idempotently.
- Existing modules remain working: products, resellers, orders, payments, fulfillment, dashboard.
- Tests cover feature helpers, server-action validation logic where possible, CSV escaping, and catalog completeness.
- `npm run test`, `npm run typecheck`, and `npm run build` pass.

---

## Tests to Run

Run from `C:\Users\PC_07\ampersand-live-console`:

```bash
npm run test
npm run typecheck
npm run build
```

Suggested targeted tests:

```bash
npm run test -- tests/inventory-procurement-permissions.test.ts
npm run test -- tests/bigo-catalog.test.ts
npm run test -- tests/csv.test.ts
npm run test -- tests/treasury-ledger.test.ts
```

Manual smoke test after build:

1. Start dev server: `npm run dev`.
2. Open `/dashboard`; verify existing metrics plus inventory/treasury KPIs.
3. Open `/products`; verify BIGO catalog rows are visible.
4. Open `/orders/new`; select a BIGO package and verify displayed price matches catalog.
5. Submit an order with BIGO ID and payment proof path.
6. Open `/payments`; verify payment and select a treasury account.
7. Open `/fulfillment`; fulfill order and confirm negative inventory movement.
8. Open `/procurement`; create a batch and progress to replenished.
9. Open `/inventory`; confirm positive procurement and negative order movements.
10. Open `/treasury`; confirm payment and manual movements.
11. Click CSV exports and verify downloaded content headers/rows.

---

## Deployment Readiness Checklist

- [ ] Supabase migration `0003_bigo_diamond_catalog_seed.sql` reviewed.
- [ ] Seed/import is idempotent and does not duplicate catalog rows.
- [ ] No destructive schema changes.
- [ ] RLS policies still allow authorized admin operations for procurement, inventory, and treasury.
- [ ] All env vars present in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - any existing server/service vars used by the app
- [ ] `npm run test` passes locally.
- [ ] `npm run typecheck` passes locally.
- [ ] `npm run build` passes locally.
- [ ] Live Supabase smoke test completed with one procurement replenishment and one fulfilled order.
- [ ] CSV exports verified in browser.
- [ ] Vercel preview deployment reviewed on mobile viewport.
- [ ] Production deployment approved only after preview smoke test.

---

## Commit Plan

1. `docs: add sprint 4 implementation plan`
2. `feat: add procurement console`
3. `feat: add inventory ledger console`
4. `feat: add treasury console`
5. `feat: add inventory and treasury dashboard kpis`
6. `feat: add csv exports`
7. `feat: seed official bigo diamond catalog`
8. `test: add sprint 4 coverage`
