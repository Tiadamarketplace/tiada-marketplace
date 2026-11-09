-- Tiada redesign: run once in Supabase (SQL Editor > New query > paste > Run), after schema.sql.
-- Safe to run twice.

-- 1. Foodstuffs aisle + stock for each size.
--    Each entry in products.sizes can now carry "stock" (a number). products.stock stays as the total.
update products
set sizes = (
  select jsonb_agg(case when s ? 'stock' then s else s || jsonb_build_object('stock', case when (s->>'na')::boolean then 0 else greatest(0, products.stock / greatest(1, (select count(*) from jsonb_array_elements(products.sizes) x where not coalesce((x->>'na')::boolean, false))))::int end) end)
  from jsonb_array_elements(products.sizes) s
)
where not exists (select 1 from jsonb_array_elements(products.sizes) s where s ? 'stock');

-- 2. "Tell me when it's back"
create table if not exists stock_alerts (
  id           uuid primary key default gen_random_uuid(),
  product_id   text not null references products(id) on delete cascade,
  size         text not null,
  email        text not null,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  unique (product_id, size, email)
);
create index if not exists stock_alerts_waiting_idx on stock_alerts(product_id, size) where notified_at is null;

-- 3. Discount codes (replaces the old "vouchers" setting)
create table if not exists vouchers (
  code        text primary key,                 -- upper case, e.g. FIRSTORDER
  kind        text not null default 'amt',      -- amt (naira off) | pct (percent off)
  value       int  not null,
  cap         int,                              -- most a percent code can take off
  min_order   int  not null default 0,
  ends_at     date,
  max_uses    int,                              -- null = no limit
  used        int  not null default 0,
  once_each   boolean not null default true,    -- once per customer email
  is_on       boolean not null default true,
  created_at  timestamptz not null default now()
);
insert into vouchers (code, kind, value, min_order, ends_at, once_each)
values ('FIRSTORDER', 'amt', 2000, 20000, (now() + interval '60 days')::date, true)
on conflict (code) do nothing;

-- 4. Home page slider (re-uses promos)
alter table promos add column if not exists style      text not null default 'photo';  -- photo | color | image
alter table promos add column if not exists color      text not null default '#0B3A23';
alter table promos add column if not exists shade      numeric(3,2) not null default 0.85;
alter table promos add column if not exists button     text not null default 'Shop now';
alter table promos add column if not exists link_type  text not null default 'product'; -- product | aisle | deals | url
alter table promos add column if not exists link_to    text;
alter table promos add column if not exists starts_at  timestamptz not null default now();
alter table promos add column if not exists sort       int not null default 100;
alter table promos alter column title type text;

-- 5. Newsletter sign-ups from the footer (people without an account)
create table if not exists subscribers (
  email       text primary key,
  token       text not null default encode(gen_random_bytes(16), 'hex'),  -- for one-click unsubscribe
  created_at  timestamptz not null default now(),
  left_at     timestamptz
);

-- 6. Contact form on the Help page
create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  text        text not null,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 7. Shop settings defaults (edit them in Admin > Shop settings)
insert into settings (key, value) values
  ('business', '{"name":"Tiada Marketplace","tagline":"Your trusted plug","address":"27, Finance Road, Maplewood Estate, Agege, Lagos State","phone":"0807 511 0000","whatsapp":"2348075110000","email":"tiadamarketplace0@gmail.com","tiktok":"tiadamarketplace"}'),
  ('hours', '[["Monday",true,"08:00","18:00"],["Tuesday",true,"08:00","18:00"],["Wednesday",true,"08:00","18:00"],["Thursday",true,"08:00","18:00"],["Friday",true,"08:00","18:00"],["Saturday",true,"09:00","16:00"],["Sunday",false,"10:00","14:00"]]'),
  ('alerts', '{"sound":true,"email":true,"emailTo":"","whatsapp":false,"waTo":"","daily":true,"lowStock":true}'),
  ('policies', '{"returns":"If something arrives damaged or missing, message us within 24 hours with a photo and we’ll replace it or refund you.","delivery":"We deliver on your area’s set day. Someone needs to be at the address to receive the order."}'),
  ('slider', '{"on":true,"seconds":6}')
on conflict (key) do nothing;

-- lock the new tables like the rest: only the server can read or write them
alter table stock_alerts enable row level security;
alter table vouchers enable row level security;
alter table subscribers enable row level security;
alter table contact_messages enable row level security;

-- stock for one size (used when an order is packed or cancelled)
create or replace function adjust_size_stock(p_id text, p_size text, delta int) returns void language plpgsql as $$
declare s jsonb; tot int;
begin
  select jsonb_agg(case when x->>'label' = p_size then x || jsonb_build_object('stock', greatest(0, coalesce((x->>'stock')::int, 0) + delta)) else x end)
    into s from products, jsonb_array_elements(products.sizes) x where products.id = p_id;
  if s is null then return; end if;
  select coalesce(sum(coalesce((x->>'stock')::int, 0)), 0) into tot from jsonb_array_elements(s) x;
  update products set sizes = s, stock = tot,
    status = case when tot <= 0 then 'out' when status = 'out' and tot > 0 then 'in' else status end,
    updated_at = now()
  where id = p_id;
end $$;
