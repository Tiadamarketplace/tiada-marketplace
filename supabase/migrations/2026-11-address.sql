-- Addresses from the map (November 2026). Run in Supabase > SQL Editor. Safe to run twice.
-- Stores where each order and saved address is on the map, so the rider gets a Google Maps link.
alter table orders    add column if not exists spot jsonb;
alter table addresses add column if not exists spot jsonb;
