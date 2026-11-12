-- Editing orders (November 2026). Run in Supabase > SQL Editor. Safe to run twice.
-- Keeps what the customer actually paid when an order is changed afterwards in Admin.
alter table orders add column if not exists paid integer;
-- also from the address update, in case it wasn't run yet
alter table orders    add column if not exists spot jsonb;
alter table addresses add column if not exists spot jsonb;
