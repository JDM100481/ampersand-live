# Sprint 6 — Ampersand LIVE Sales Reports

## Goal
Build admin-only reports from the BIGO Excel-style sales report while preserving the core accounting rule:

- Products are selling packages only.
- Procurement cost is invoice-level.
- Inventory is pooled Dias inventory.
- Profit is calculated from procurement invoice cost per Dias, not SKU cost.

## Routes
- `/reports` — admin reporting hub.
- `/reports/sales` — sales report with procurement, sales, inventory, detail table, and CSV export.
- `/reports/procurement` — BIGO Singapore invoice landed cost report.
- `/reports/inventory` — pooled Dias balance/value report.
- `/reports/treasury` — protected treasury reconciliation shell.
- `/reports/sales/export` — Excel-compatible CSV export.

## Implemented report sections
1. Procurement Invoice Summary
   - Invoice Number, Invoice Date, Supplier, USD Amount, FX, Total Landed Cost, Dias Received, Cost per Dias, and invoice attachment link.
2. Sales Summary
   - Orders, customers, Dias sold, revenue PHP, COGS PHP, gross profit PHP, margin %.
3. Inventory Summary
   - Beginning Dias balance, Dias received, Dias sold, ending Dias balance, inventory value PHP.
4. Sales Detail Table
   - Date, customer, BIGO ID, package, Dias sold, PHP amount, payment method, status, fulfillment reference.
5. Export
   - CSV with Excel-compatible headings and quoted fields.

## Controls
- Reports and exports are admin-only through `canViewAdminReports` / `canExportReports`.
- `/reports` and child routes are auth-protected in middleware route matching.
- Product page remains cost-free and does not expose procurement cost, COGS, FX, or margin.

## Verification
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
