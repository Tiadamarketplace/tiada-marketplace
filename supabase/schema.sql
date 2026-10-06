-- Tiada Marketplace database
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- The website talks to the database only from the server (service role key),
-- so Row Level Security is switched on with no public policies: nobody can read
-- or write these tables directly from a browser.

create extension if not exists pgcrypto;

-- ---------- catalogue ----------
create table if not exists products (
  id          text primary key,
  name        text not null,
  cat         text not null,                 -- cereal | milk | grain | ccombo | fcombo
  items       jsonb,                         -- combo contents, null for single products
  sizes       jsonb not null,                -- [{label, price, sale, kg, na}]
  status      text not null default 'in',    -- in | fast | out | na
  stock       int  not null default 0,
  low         int  not null default 5,
  hidden      boolean not null default false,
  img         text,
  short       text,
  sort        int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists zones (
  id      text primary key,                  -- z1..z7 (Lagos) or st:<State>
  label   text not null,
  km      int  not null,
  fee     int  not null,
  day     text,                              -- economy batch day (Lagos)
  state   text,                              -- set for other states
  city    text,
  region  text,                              -- sw | ss | nc | nw
  days    text,                              -- courier time
  sort    int not null default 100
);

create table if not exists settings (
  key    text primary key,
  value  jsonb not null
);

create table if not exists promos (
  id          text primary key default ('pr' || substr(gen_random_uuid()::text,1,8)),
  title       text not null,
  eyebrow     text,
  text        text,
  product_id  text references products(id) on delete set null,
  img         text,
  cls         text default '',
  ends_at     timestamptz not null,
  is_on       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- customers ----------
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text,
  phone       text,
  promo_ok    boolean not null default false,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz
);

create table if not exists login_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  used        boolean not null default false,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists login_codes_email_idx on login_codes(email, created_at desc);

create table if not exists addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers(id) on delete cascade,
  label        text not null,
  street       text not null,
  landmark     text,
  zone_id      text references zones(id),
  created_at   timestamptz not null default now()
);

-- ---------- orders ----------
create sequence if not exists order_seq start 84950;

create table if not exists orders (
  id             text primary key default ('TD-' || nextval('order_seq')),
  customer_id    uuid references customers(id) on delete set null,
  email          text not null,
  name           text not null,
  phone          text not null,
  address        text not null,
  landmark       text,
  zone_id        text references zones(id),
  area_label     text,
  speed          text not null,
  speed_label    text,
  items          jsonb not null,             -- [{pid, name, size, qty, price, was, kg, swaps:[{from,to}]}]
  note           text,
  subtotal       int not null,
  discount       int not null default 0,
  voucher        text,
  delivery_fee   int not null,
  total          int not null,
  kg             numeric(8,2) not null default 0,
  status         text not null default 'pending',   -- pending | new | packed | route | done | issue | refunded | cancelled | expired
  prev_status    text,
  pay_ref        text unique,
  pay_account    jsonb,                     -- {bank, number, name, expires_at}
  paid_at        timestamptz,
  rider          jsonb,                     -- {partner, tracking, driver, phone, cost}
  confirm        jsonb,                     -- {how, note, by, at}
  issue          jsonb,
  refunds        jsonb not null default '[]',
  stock_taken    boolean not null default false,
  track_fails    int not null default 0,  -- stock removed when packed; put back if cancelled
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_customer_idx on orders(customer_id, created_at desc);
create index if not exists orders_status_idx on orders(status, created_at desc);

-- every message sent to a customer (emails + in-app inbox)
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references customers(id) on delete cascade,
  order_id     text references orders(id) on delete cascade,
  kind         text not null,               -- placed | route | done | issue | refund | cancel | note | security | promo | chat
  title        text not null,
  body         text not null,
  data         jsonb,
  email_to     text,
  email_id     text,                        -- Resend id
  email_ok     boolean,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists messages_customer_idx on messages(customer_id, created_at desc);

-- ---------- reviews ----------
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   text references products(id) on delete cascade,
  order_id     text references orders(id) on delete set null,
  customer_id  uuid references customers(id) on delete cascade,
  name         text not null,
  stars        int not null check (stars between 1 and 5),
  text         text not null,
  status       text not null default 'pending',  -- pending | live | hidden
  reply        text,
  created_at   timestamptz not null default now()
);

-- ---------- live chat ----------
create table if not exists chats (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references customers(id) on delete set null,
  name         text,
  email        text,
  status       text not null default 'bot',   -- bot | waiting | open | closed
  agent        text,
  token        text not null,                  -- lets a guest keep their chat
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create table if not exists chat_messages (
  id         bigserial primary key,
  chat_id    uuid not null references chats(id) on delete cascade,
  who        text not null,                    -- me | bot | agent | sys
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_chat_idx on chat_messages(chat_id, id);

-- ---------- staff ----------
create table if not exists staff (
  id             uuid primary key default gen_random_uuid(),
  email          text unique not null,
  name           text not null,
  role           text not null default 'staff',   -- owner | staff | support
  password_hash  text not null,
  totp_secret    text not null,
  active         boolean not null default true,
  failed         int not null default 0,
  locked_until   timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists activity (
  id          bigserial primary key,
  staff_name  text,
  text        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists broadcasts (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  body        text not null,
  audience    text not null,
  sent        int not null default 0,
  staff_name  text,
  created_at  timestamptz not null default now()
);

-- lock everything down: only the server (service role) can touch these tables
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- stock helper used when an order is packed or cancelled
create or replace function adjust_stock(p_id text, delta int) returns void language sql as $$
  update products set stock = greatest(0, stock + delta),
    status = case when stock + delta <= 0 then 'out' when status = 'out' and stock + delta > 0 then 'in' else status end,
    updated_at = now()
  where id = p_id;
$$;

-- product photos bucket (public read, uploads only through the server)
insert into storage.buckets (id, name, public) values ('products','products', true)
  on conflict (id) do nothing;
