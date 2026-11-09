-- Product photos, round 2 (November 2026). Run in Supabase > SQL Editor. Safe to run twice.
update products set img = '/img/p/cornflakes.jpg', updated_at = now() where id = 'cornflakes';
update products set img = '/img/p/cocopops.jpg',   updated_at = now() where id = 'cocopops';
update products set img = '/img/p/frosties.jpg',   updated_at = now() where id = 'frosties';
update products set img = '/img/p/milk.jpg', name = 'Lactorich Milk Powder', updated_at = now() where id = 'milk';
update products set img = '/img/p/fruitfiber.jpg', updated_at = now() where id = 'fruitfiber';
update products set img = '/img/p/granola.jpg',    updated_at = now() where id = 'granola';
update products set img = '/img/p/cc2.jpg',        updated_at = now() where id = 'cc2';   -- Breakfast Starter
update products set img = '/img/p/cc3.jpg',        updated_at = now() where id = 'cc3';   -- Oat & Stars
update products set img = '/img/p/foodcombo.jpg',      updated_at = now() where id in ('fcE', 'fc1');        -- with beans
update products set img = '/img/p/foodcombo-oil.jpg',  updated_at = now() where id = 'fc3';                  -- with vegetable oil
update products set img = '/img/p/foodcombo-semo.jpg', updated_at = now() where id in ('fc4', 'fc5', 'fc6');  -- with Semovita

-- Dano and Peak milk, added HIDDEN with no prices yet. Price them in Admin > Products, then switch them on.
insert into products (id, name, cat, items, sizes, status, stock, low, hidden, img, short, sort) values
  ('dano', 'Dano Full Cream Milk Powder', 'milk', null, '[{"label":"400g tin","price":null,"sale":null,"kg":0.45,"na":false,"stock":0},{"label":"900g tin","price":null,"sale":null,"kg":1,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/dano.jpg', 'DANO', 3),
  ('peak', 'Peak Full Cream Milk Powder', 'milk', null, '[{"label":"400g tin","price":null,"sale":null,"kg":0.45,"na":false,"stock":0},{"label":"900g tin","price":null,"sale":null,"kg":1,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/peak.jpg', 'PEAK', 4)
on conflict (id) do nothing;
