-- Riders and delivery codes (November 2026). Run in Supabase > SQL Editor. Safe to run twice.
-- Includes the earlier November updates too, so this one file is enough.

-- each rider gets a private link (the token); switch them off to stop the link working
create table if not exists riders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  token      text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table riders enable row level security;  -- only the website (service key) can read it

-- the 4-digit code the customer gives the rider at the door
alter table orders add column if not exists drop_code text;

-- earlier November updates (safe if already run)
alter table orders    add column if not exists paid integer;
alter table orders    add column if not exists spot jsonb;
alter table addresses add column if not exists spot jsonb;
