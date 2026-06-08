# Ampersand LIVE Console

Manual-first digital commerce operating system for BIGO reseller operations.

## Current build

This project is now a stable Next.js 14 / React 18 app with Tailwind CSS, `@supabase/ssr`, Supabase Auth wiring, protected console layout, and Supabase-backed modules for:

- Dashboard
- Products
- Resellers
- Orders
- Payment Verification
- Manual Fulfillment

The previously tested financial/domain core remains folded into the server actions:

```text
src/features/orders/order-status.ts
src/features/orders/order-financials.ts
src/features/payments/payment-status.ts
src/features/procurement/procurement-status.ts
src/features/inventory/inventory-ledger.ts
src/features/profit/profit-calculator.ts
src/features/resellers/commission-calculator.ts
src/lib/money.ts
src/lib/permissions.ts
```

## App routes

```text
/login
/dashboard
/products
/resellers
/orders
/orders/new
/payments
/fulfillment
```

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql`.
3. Create private storage buckets:
   - `payment-proofs`
   - `fulfillment-proofs`
   - `procurement-documents`
4. Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

## Verified locally

- `npm test` — 32 tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed with no warnings/errors.
- `npm run build` — production build completed successfully.
- Browser smoke test opened `/dashboard` and `/products` on local dev server.

## Business rules encoded

- Orders cannot be fulfilled before verified payment / fulfillment queue status.
- Product price, USD cost, FX rate, and commission are snapshotted when the order is created.
- Payment verification validates amount matching unless variance is approved.
- Payment rejection requires a reason.
- Verified payment can create a PHP treasury movement when a treasury account is selected.
- Manual fulfillment requires BIGO reference and confirmation checkbox.
- Fulfillment creates a negative USD inventory movement.
- Gross profit uses historical order snapshot values.

## Notes

- With empty Supabase env vars, the app safely renders empty preview data and disables live writes by throwing a clear configuration error.
- Next.js 14.2.35 is used to satisfy the requested stable Next.js 14 baseline. `npm audit --omit=dev` currently reports advisories against the Next 14 line and recommends a breaking upgrade to Next 16; this was not applied because the requested target is Next.js 14.
