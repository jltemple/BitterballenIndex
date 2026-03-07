# Community Submissions Feature Plan

## Overview
Allow the public to submit bitterballen venues and prices. Submissions go into a
`pending` state and are reviewed by the admin before being published.

---

## 1. Database — new `community_submissions` table

```sql
CREATE TABLE community_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_name         TEXT NOT NULL,
  address          TEXT,
  lat              FLOAT,
  lng              FLOAT,
  neighborhood     TEXT,           -- derived server-side on submission
  website          TEXT,
  price_cents      INTEGER CHECK (price_cents > 0),
  quantity         INTEGER DEFAULT 6,
  notes            TEXT,
  submitter_name   TEXT,           -- optional, shown to admin
  submitter_email  TEXT,           -- optional, for follow-up
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  admin_notes      TEXT,           -- admin can leave a reason when rejecting
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ
);

-- RLS: anyone can INSERT (submit), nobody can SELECT (private), service role full access
ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert" ON community_submissions FOR INSERT TO anon WITH CHECK (true);
```

Migration file: `supabase/migrations/YYYYMMDD_community_submissions.sql`

---

## 2. Public API — `POST /api/submissions`

**File:** `app/api/submissions/route.ts`

- **Input (JSON body):**
  - `bar_name` (required)
  - `address` (optional)
  - `lat` / `lng` (optional — if provided, derive `neighborhood` server-side)
  - `website` (optional)
  - `price_cents` (optional integer > 0)
  - `quantity` (optional integer, default 6)
  - `notes` (optional)
  - `submitter_name` (optional)
  - `submitter_email` (optional)
- **Server-side:**
  - Validate required fields and numeric constraints
  - If lat/lng present → call `getNeighborhoodFromCoords` to set `neighborhood`
  - Insert into `community_submissions` with `status = 'pending'`
  - Return `201 Created` with `{ id }`
- **Rate limiting / spam:** Minimal for now — can add later

---

## 3. Admin API routes

### `GET /api/admin/community-submissions`
Returns all submissions with `status = 'pending'`, ordered by `created_at ASC`.

### `POST /api/admin/community-submissions/[id]/approve`
- Body: `{ price_cents?, quantity?, notes? }` (admin can override)
- Creates a new `bars` row (reusing existing `POST /api/admin/bars` logic)
- If `price_cents` present, creates a `prices` row
- Sets `community_submissions.status = 'approved'`, `reviewed_at = NOW()`
- Revalidates caches for both locales
- Returns `201`

### `POST /api/admin/community-submissions/[id]/reject`
- Body: `{ admin_notes? }` (optional reason)
- Sets `status = 'rejected'`, `reviewed_at = NOW()`, `admin_notes`
- Returns `200`

---

## 4. Public submission form

**File:** `app/[locale]/submit/page.tsx`
**Route:** `/en/submit` and `/nl/submit`

A clean, minimal form with:
- Bar name (required, with Nominatim autocomplete — reuse existing pattern)
- Address (optional, auto-filled from Nominatim)
- Lat / Lng (hidden, auto-filled from Nominatim)
- Website (optional)
- Price paid (€ input, optional)
- Quantity (default 6, optional)
- Notes / extra info (optional textarea)
- Your name (optional)
- Contact email (optional)
- Submit button → `POST /api/submissions`
- Success/error feedback state

Also: add a "Submit a venue" link in the public navigation bar.

---

## 5. Admin review page for community submissions

**File:** `app/admin/(protected)/community-submissions/page.tsx`
**Route:** `/admin/community-submissions`

Modelled after the existing `/admin/(protected)/review` page:
- Lists all pending submissions
- Shows: bar name, address, price, submitter info, submitted date
- Per-submission editable price/quantity (admin override before approving)
- Optional admin notes field (shown when rejecting)
- Three actions per row:
  - **Approve** → POST approve endpoint → removes from list
  - **Reject** → POST reject endpoint → removes from list
  - Shows count of pending submissions

Also: add a link/badge to this page from the admin dashboard when there are pending submissions.

---

## 6. i18n translations

Add keys to `messages/en.json` and `messages/nl.json`:

```json
// en.json additions
"submit": {
  "title": "Submit a Venue",
  "description": "Know a bar that serves bitterballen? Submit it here.",
  "barName": "Bar name",
  "address": "Address",
  "website": "Website",
  "price": "Price paid (€)",
  "quantity": "Number of pieces",
  "notes": "Notes (optional)",
  "yourName": "Your name (optional)",
  "yourEmail": "Contact email (optional)",
  "submit": "Submit",
  "success": "Thank you! Your submission is under review.",
  "error": "Something went wrong. Please try again."
}
```

---

## 7. Navigation updates

- Add `<Link href="/{locale}/submit">Submit a venue</Link>` to the public nav
- Add "Community submissions" with a pending count badge to the admin dashboard sidebar/header

---

## Implementation Order

1. Migration SQL file (`supabase/migrations/`)
2. Apply migration (or update `supabase/schema.sql`)
3. Public API route (`app/api/submissions/route.ts`)
4. Admin API routes (`app/api/admin/community-submissions/`)
5. Public submit page (`app/[locale]/submit/`)
6. Admin review page (`app/admin/(protected)/community-submissions/`)
7. i18n translations
8. Navigation links
9. Admin dashboard badge for pending count
