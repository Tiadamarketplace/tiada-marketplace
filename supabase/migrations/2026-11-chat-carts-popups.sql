-- Tiada: cart reminder emails and pop-up banners (November 2026).
-- Safe to run more than once. Paste it all into Supabase → SQL Editor → Run.

-- 1. Saved carts, for one "you left something in your cart" email ~3 hours later
create table if not exists public.carts (
  key text primary key,                 -- the customer's email, lower case
  email text not null,
  name text,
  items jsonb not null default '[]'::jsonb,
  token text not null unique,           -- for the "Finish my order" link in the email
  updated_at timestamptz not null default now(),
  reminded_at timestamptz
);
create index if not exists carts_due_idx on public.carts (updated_at) where reminded_at is null;
alter table public.carts enable row level security;

-- 2. Pop-up banners, managed in Admin → Pop-ups
create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  text text not null default '',
  img text,
  button text not null default '',
  href text not null default '',
  audience text not null default 'all' check (audience in ('all', 'visitors', 'customers')),
  freq text not null default 'once' check (freq in ('once', 'daily', 'visit')),
  delay int not null default 3,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_on boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.popups enable row level security;

-- 3. Quiet chats close by themselves; this keeps that quick
create index if not exists chats_open_idx on public.chats (updated_at) where status <> 'closed';
