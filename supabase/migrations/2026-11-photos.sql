-- Product photos (November 2026). Run in Supabase > SQL Editor after 2026-11-redesign.sql. Safe to run twice.
-- The pictures themselves are in public/img/p/ and go live with the website.

-- 1. New photos for products already in the shop
update products set img = '/img/p/goldenmorn.jpg', updated_at = now() where id = 'goldenmorn';
update products set img = '/img/p/fruitfiber.jpg', updated_at = now() where id = 'fruitfiber';
update products set img = '/img/p/milo.jpg',       updated_at = now() where id = 'milo';
update products set img = '/img/p/chocomalt.jpg',  updated_at = now() where id = 'chocomalt';
update products set img = '/img/p/oat.jpg',        updated_at = now() where id = 'oat';
update products set img = '/img/p/moonstar.jpg',   updated_at = now() where id = 'moonstar';
update products set img = '/img/p/custard.jpg',    updated_at = now() where id = 'custard';
update products set img = '/img/p/cc1.jpg',        updated_at = now() where id = 'cc1';   -- Lactorich, Cornflakes, Coco Pops, Golden Morn
update products set img = '/img/p/cc4.jpg',        updated_at = now() where id = 'cc4';   -- Dano, Coco Pops, Moon and Stars, Oats, Golden Morn, Fruit and Fibre
update products set img = '/img/p/cc5.jpg',        updated_at = now() where id = 'cc5';   -- Lactorich, Moon and Stars, Coco Pops
update products set img = '/img/p/foodcombo.jpg',  updated_at = now() where cat = 'fcombo';

-- 2. Foodstuffs, added HIDDEN with no prices yet.
--    In Admin > Products: open each one, type the prices (change the sizes if you like),
--    set the stock, then switch "Show in the shop" on.
insert into products (id, name, cat, items, sizes, status, stock, low, hidden, img, short, sort) values
  ('rice',       'Rice',             'food', null, '[{"label":"1kg","price":null,"sale":null,"kg":1,"na":false,"stock":0},{"label":"2kg","price":null,"sale":null,"kg":2,"na":false,"stock":0},{"label":"5kg","price":null,"sale":null,"kg":5,"na":false,"stock":0},{"label":"1 paint","price":null,"sale":null,"kg":4,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/rice.jpg', 'RICE', 200),
  ('brownbeans', 'Brown Beans (Oloyin)', 'food', null, '[{"label":"1kg","price":null,"sale":null,"kg":1,"na":false,"stock":0},{"label":"2kg","price":null,"sale":null,"kg":2,"na":false,"stock":0},{"label":"5kg","price":null,"sale":null,"kg":5,"na":false,"stock":0},{"label":"1 paint","price":null,"sale":null,"kg":4,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/brownbeans.jpg', 'BEANS', 201),
  ('garri',      'Garri Ijebu',      'food', null, '[{"label":"1kg","price":null,"sale":null,"kg":1,"na":false,"stock":0},{"label":"2kg","price":null,"sale":null,"kg":2,"na":false,"stock":0},{"label":"5kg","price":null,"sale":null,"kg":5,"na":false,"stock":0},{"label":"1 paint","price":null,"sale":null,"kg":3.5,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/garri.jpg', 'GARRI', 202),
  ('semovita',   'Semovita',         'food', null, '[{"label":"1kg","price":null,"sale":null,"kg":1,"na":false,"stock":0},{"label":"2kg","price":null,"sale":null,"kg":2,"na":false,"stock":0},{"label":"5kg","price":null,"sale":null,"kg":5,"na":false,"stock":0},{"label":"10kg","price":null,"sale":null,"kg":10,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/semovita.jpg', 'SEMOVITA', 203),
  ('noodles',    'Noodles',          'food', null, '[{"label":"5 packs","price":null,"sale":null,"kg":0.35,"na":false,"stock":0},{"label":"10 packs","price":null,"sale":null,"kg":0.7,"na":false,"stock":0},{"label":"Carton (40)","price":null,"sale":null,"kg":2.8,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/noodles.jpg', 'NOODLES', 204),
  ('vegoil',     'Vegetable Oil',    'food', null, '[{"label":"50cl","price":null,"sale":null,"kg":0.5,"na":false,"stock":0},{"label":"1 litre","price":null,"sale":null,"kg":1,"na":false,"stock":0},{"label":"2 litres","price":null,"sale":null,"kg":2,"na":false,"stock":0},{"label":"4 litres","price":null,"sale":null,"kg":4,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/vegoil.jpg', 'VEG OIL', 205),
  ('palmoil',    'Palm Oil',         'food', null, '[{"label":"50cl","price":null,"sale":null,"kg":0.5,"na":false,"stock":0},{"label":"1 litre","price":null,"sale":null,"kg":1,"na":false,"stock":0},{"label":"2 litres","price":null,"sale":null,"kg":2,"na":false,"stock":0},{"label":"4 litres","price":null,"sale":null,"kg":4,"na":false,"stock":0}]'::jsonb, 'in', 0, 3, true, '/img/p/palmoil.jpg', 'PALM OIL', 206)
on conflict (id) do nothing;
