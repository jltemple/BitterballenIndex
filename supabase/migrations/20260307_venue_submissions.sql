-- Migration: rename discovered_venues → venue_submissions
-- and generalise it to hold both automation-scraped and community-submitted venues.
--
-- Run this in the Supabase SQL editor (or via supabase db push).
--
-- NOTE: external automation scripts (populate-venues.mjs, scrape-prices.mjs) that
-- write to discovered_venues will need to be updated to use the new table/column
-- names after this migration runs.

-- 1. Add UUID primary key column (auto-populated for all existing rows)
ALTER TABLE discovered_venues ADD COLUMN id UUID DEFAULT gen_random_uuid() NOT NULL;

-- 2. Swap primary key: drop osm_id PK, promote id to PK
ALTER TABLE discovered_venues DROP CONSTRAINT discovered_venues_pkey;
ALTER TABLE discovered_venues ADD PRIMARY KEY (id);

-- 3. Make osm_id optional (community submissions have no OSM id), keep unique
ALTER TABLE discovered_venues ALTER COLUMN osm_id DROP NOT NULL;
CREATE UNIQUE INDEX venue_submissions_osm_id_idx
  ON discovered_venues(osm_id) WHERE osm_id IS NOT NULL;

-- 4. Rename scraper-specific column names to generic equivalents
ALTER TABLE discovered_venues RENAME COLUMN scrape_status      TO status;
ALTER TABLE discovered_venues RENAME COLUMN scraped_price_cents TO price_cents;
ALTER TABLE discovered_venues RENAME COLUMN scraped_quantity    TO quantity;
ALTER TABLE discovered_venues RENAME COLUMN scrape_context      TO context;
ALTER TABLE discovered_venues RENAME COLUMN last_scraped_at     TO updated_at;
ALTER TABLE discovered_venues RENAME COLUMN added_at            TO created_at;

-- 5. Rename table
ALTER TABLE discovered_venues RENAME TO venue_submissions;

-- 6. Add community-submission columns
ALTER TABLE venue_submissions ADD COLUMN source TEXT NOT NULL DEFAULT 'automation';

-- 7. Re-create index under new names
DROP INDEX IF EXISTS discovered_venues_status_idx;
CREATE INDEX venue_submissions_status_idx  ON venue_submissions(status);
CREATE INDEX venue_submissions_source_idx  ON venue_submissions(source);

-- 8. Enable RLS and allow the public (anon) to INSERT community submissions only
ALTER TABLE venue_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "community_can_submit" ON venue_submissions
  FOR INSERT TO anon
  WITH CHECK (source = 'community' AND status = 'pending');
