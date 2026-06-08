-- Sprint 4: Official BIGO Diamond product catalog seed/import
-- Idempotent by BIGO SKU without requiring a unique constraint on products.bigo_sku.
-- Existing matching SKUs are updated with the official display name, diamond amount,
-- PHP price, active flag, and effective date. Existing USD cost is preserved.
-- Newly inserted SKUs use unit_cost_usd = 0 until wholesale cost data is available.

do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      (50, 54),
      (100, 107),
      (150, 160),
      (200, 215),
      (250, 268),
      (300, 320),
      (350, 375),
      (400, 428),
      (450, 480),
      (500, 535),
      (550, 588),
      (600, 642),
      (650, 695),
      (700, 749),
      (750, 802),
      (800, 856),
      (850, 910),
      (900, 963),
      (1000, 1060),
      (1500, 1590),
      (2000, 2120),
      (2500, 2650),
      (3000, 3180),
      (3500, 3710),
      (4000, 4240),
      (4500, 4770),
      (5000, 5250),
      (5500, 5775),
      (6000, 6300),
      (6500, 6825),
      (7000, 7350),
      (7500, 7875),
      (8000, 8400),
      (8500, 8925),
      (9000, 9450),
      (10000, 10400),
      (20000, 20800),
      (30000, 31200),
      (40000, 41600),
      (50000, 51000)
    ) as catalog(diamonds, price_php)
  loop
    if exists (
      select 1
      from products
      where bigo_sku = 'BIGO-DIAMONDS-' || rec.diamonds::text
    ) then
      update products
      set
        name = 'BIGO ' || rec.diamonds::text || ' Diamonds',
        diamond_amount = rec.diamonds,
        unit_price_php = rec.price_php,
        is_active = true,
        effective_from = current_date,
        effective_to = null,
        updated_at = now()
      where bigo_sku = 'BIGO-DIAMONDS-' || rec.diamonds::text;
    else
      insert into products (
        name,
        bigo_sku,
        diamond_amount,
        unit_cost_usd,
        unit_price_php,
        is_active,
        effective_from
      ) values (
        'BIGO ' || rec.diamonds::text || ' Diamonds',
        'BIGO-DIAMONDS-' || rec.diamonds::text,
        rec.diamonds,
        0,
        rec.price_php,
        true,
        current_date
      );
    end if;
  end loop;
end $$;
