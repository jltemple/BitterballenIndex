-- Bitterballen Index — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database

-- Bars table
create table if not exists bars (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text,
  neighborhood text,           -- derived server-side via hex-lookup.json (res-12 → res-8)
  lat          float,
  lng          float,
  h3_cell      text,           -- H3 res-12 cell (~9m edge, building-level precision)
  website      text,
  created_at   timestamptz default now()
);

-- Prices table
create table if not exists prices (
  id          uuid primary key default gen_random_uuid(),
  bar_id      uuid references bars(id) on delete cascade not null,
  price_cents integer not null check (price_cents > 0),
  notes       text,
  recorded_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_prices_bar_id_recorded_at on prices(bar_id, recorded_at desc);
create index if not exists idx_bars_neighborhood on bars(neighborhood);
create index if not exists idx_bars_h3_cell on bars(h3_cell);

-- Row Level Security
alter table bars enable row level security;
alter table prices enable row level security;

-- Allow public read access
create policy "Public can read bars" on bars for select using (true);
create policy "Public can read prices" on prices for select using (true);

-- Service role can do everything (used for admin writes via SUPABASE_SERVICE_ROLE_KEY)
-- No additional policies needed — service role bypasses RLS by default
