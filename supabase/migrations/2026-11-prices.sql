-- Prices from the Tiada price list and the Foodstuff Combo poster (November 2026).
-- Run in Supabase > SQL Editor. Safe to run twice.
-- Only the sizes listed below are touched. Stock is left as it is.
-- Any old sale price on these sizes is cleared, so customers pay the poster price.
-- To run a discount again, set a sale price in Admin > Products.

with p(id, label, price) as (values
  -- Milk, Milo, Choco Malt
  ('milk', '250g', 3500), ('milk', '500g', 5800), ('milk', '1kg', 10500), ('milk', '1 paint', 19000),
  ('milo', '250g', 4000), ('milo', '500g', 7300), ('milo', '1kg', 13500), ('milo', '1 paint', 27000),
  ('chocomalt', '250g', 3500), ('chocomalt', '500g', 5800), ('chocomalt', '1kg', 10500), ('chocomalt', '1 paint', 12500),
  -- Cereals
  ('frosties', '250g', 2800), ('frosties', '500g', 4900), ('frosties', '1kg', 8700), ('frosties', '1 paint', 10500),
  ('cornflakes', '250g', 2800), ('cornflakes', '500g', 4500), ('cornflakes', '1kg', 7500), ('cornflakes', '1 paint', 10000),
  ('cocopops', '250g', 3000), ('cocopops', '500g', 4900), ('cocopops', '1kg', 7300), ('cocopops', '1 paint', 10500),
  ('moonstar', '250g', 3500), ('moonstar', '500g', 5700), ('moonstar', '1kg', 10500), ('moonstar', '1 paint', 12500),
  ('fruitfiber', '250g', 4800), ('fruitfiber', '500g', 8300), ('fruitfiber', '1kg', 15500), ('fruitfiber', '1 paint', 18500),
  ('goldenmorn', '250g', 2600), ('goldenmorn', '500g', 3100), ('goldenmorn', '1kg', 6700), ('goldenmorn', '1 paint', 10500),
  -- Oats, Custard, Granola (blank on the price list = not sold in that size)
  ('oat', '250g', 2500), ('oat', '500g', 4000), ('oat', '1kg', 6100), ('oat', '1 paint', 9000),
  ('custard', '250g', null), ('custard', '500g', 4500), ('custard', '1kg', 7500), ('custard', '1 paint', 10500),
  ('granola', '250g', 9500), ('granola', '500g', null), ('granola', '1kg', null), ('granola', '1 paint', null),
  -- Foodstuff combos
  ('fcE', 'Package', 5000), ('fc1', 'Package', 10000), ('fc3', 'Package', 15000),
  ('fc4', 'Package', 20000), ('fc5', 'Package', 25000), ('fc6', 'Package', 30000)
)
update products pr
set sizes = (
  select jsonb_agg(
    case
      when p.id is null then s                                                              -- size not on the list: unchanged
      when p.price is null then s || '{"price": null, "sale": null, "na": true}'::jsonb      -- not sold in this size
      else s || jsonb_build_object('price', p.price, 'sale', null, 'na', false)
    end order by e.n)
  from jsonb_array_elements(pr.sizes) with ordinality as e(s, n)
  left join p on p.id = pr.id and p.label = e.s->>'label'
),
updated_at = now()
where pr.id in (select distinct id from p);

-- Check: lists any size in the shop for these products that the price list did not cover.
-- An empty result means every size got its price.
select pr.id, pr.name, e.s->>'label' as size_not_priced
from products pr, jsonb_array_elements(pr.sizes) e(s)
where pr.id in ('milk','milo','chocomalt','frosties','cornflakes','cocopops','moonstar','fruitfiber','goldenmorn','oat','custard','granola','fcE','fc1','fc3','fc4','fc5','fc6')
  and coalesce((e.s->>'na')::boolean, false) = false
  and (e.s->>'price') is null;
