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
-- ALTER TABLE bars ADD COLUMN IF NOT EXISTS osm_id bigint;
-- CREATE UNIQUE INDEX IF NOT EXISTS bars_osm_id_idx ON bars(osm_id) WHERE osm_id IS NOT NULL;
-- CREATE TABLE IF NOT EXISTS dismissed_osm_nodes (osm_id bigint PRIMARY KEY, dismissed_at timestamptz DEFAULT now());
-- See supabase/migrations/20260307_venue_submissions.sql for the venue_submissions table
-- (renamed and extended from discovered_venues — run that migration on existing databases).
--
-- venue_submissions table (created by migration above):
--   id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
--   osm_id           bigint UNIQUE (nullable — only set for automation-sourced venues)
--   name             text NOT NULL
--   address          text
--   lat              float NOT NULL
--   lng              float NOT NULL
--   website          text
--   amenity          text
--   status           text NOT NULL DEFAULT 'pending'  -- pending | price_found | no_price | imported | dismissed
--   price_cents      integer
--   quantity         integer NOT NULL DEFAULT 6
--   context          text   -- scraper excerpt or community notes
--   updated_at       timestamptz
--   created_at       timestamptz DEFAULT now()
--   source           text NOT NULL DEFAULT 'automation'  -- automation | community
--   submitter_name   text
--   submitter_email  text
