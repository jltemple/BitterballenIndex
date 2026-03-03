-- Bitterballen Index — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database

-- Bars table
create table if not exists bars (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text,
  neighborhood text,           -- derived server-side via point-in-polygon (amsterdam-neighborhoods.geojson)
  lat          float,
  lng          float,
  website      text,
  created_at   timestamptz default now()
);

-- Prices table
create table if not exists prices (
  id          uuid primary key default gen_random_uuid(),
  bar_id      uuid references bars(id) on delete cascade not null,
  price_cents integer not null check (price_cents > 0),
  quantity    integer not null default 6,
  notes       text,
  recorded_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_prices_bar_id_recorded_at on prices(bar_id, recorded_at desc);
create index if not exists idx_bars_neighborhood on bars(neighborhood);

-- Row Level Security
alter table bars enable row level security;
alter table prices enable row level security;

-- Allow public read access
create policy "Public can read bars" on bars for select using (true);
create policy "Public can read prices" on prices for select using (true);

-- Service role can do everything (used for admin writes via SUPABASE_SERVICE_ROLE_KEY)
-- No additional policies needed — service role bypasses RLS by default

-- Migration notes (run these if upgrading an existing database):
-- ALTER TABLE bars DROP COLUMN IF EXISTS h3_cell;
-- DROP INDEX IF EXISTS idx_bars_h3_cell;
-- ALTER TABLE prices ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 6;
