"use client";

import { useEffect, useState, useCallback } from "react";

interface ReviewVenue {
  osm_id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  website: string | null;
  amenity: string;
  scraped_price_cents: number;
  scraped_quantity: number;
  scrape_context: string | null;
  last_scraped_at: string;
}

interface EditedPrice {
  euro: string;
  qty: string;
}

export default function ReviewPage() {
  const [venues, setVenues] = useState<ReviewVenue[] | null>(null);
  const [edits, setEdits] = useState<Map<number, EditedPrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/review");
      const { venues: data } = await res.json();
      setVenues(data);
      // Pre-fill edits from scraped data
      const map = new Map<number, EditedPrice>();
      for (const v of data ?? []) {
        map.set(v.osm_id, {
          euro: (v.scraped_price_cents / 100).toFixed(2),
          qty: String(v.scraped_quantity),
        });
      }
      setEdits(map);
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setEdit(osm_id: number, field: "euro" | "qty", value: string) {
    setEdits((prev) => {
      const next = new Map(prev);
      const existing = next.get(osm_id) ?? { euro: "", qty: "6" };
      next.set(osm_id, { ...existing, [field]: value });
      return next;
    });
  }

  function perPiece(osm_id: number): string | null {
    const p = edits.get(osm_id);
    if (!p?.euro) return null;
    const euro = parseFloat(p.euro);
    const qty = parseInt(p.qty || "6", 10);
    if (isNaN(euro) || isNaN(qty) || qty <= 0) return null;
    return `€${(euro / qty).toFixed(2)}/pc`;
  }

  async function approve(venue: ReviewVenue) {
    const p = edits.get(venue.osm_id);
    const euro = parseFloat(p?.euro ?? "");
    const qty = parseInt(p?.qty ?? "6", 10);
    if (isNaN(euro) || euro <= 0) {
      setStatus("Enter a valid price before approving.");
      return;
    }

    setBusy((prev) => new Set(prev).add(venue.osm_id));
    setStatus(null);

    try {
      const res = await fetch("/api/admin/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osm_id: venue.osm_id,
          name: venue.name,
          address: venue.address,
          lat: venue.lat,
          lng: venue.lng,
          website: venue.website,
          price_euro: euro,
          quantity: isNaN(qty) ? 6 : qty,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setVenues((prev) => prev?.filter((v) => v.osm_id !== venue.osm_id) ?? []);
      setStatus(`✓ "${venue.name}" approved and added to bars`);
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy((prev) => { const s = new Set(prev); s.delete(venue.osm_id); return s; });
    }
  }

  async function skip(venue: ReviewVenue) {
    setBusy((prev) => new Set(prev).add(venue.osm_id));
    await fetch("/api/admin/discover/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ osm_id: venue.osm_id }),
    });
    setVenues((prev) => prev?.filter((v) => v.osm_id !== venue.osm_id) ?? []);
    setBusy((prev) => { const s = new Set(prev); s.delete(venue.osm_id); return s; });
  }

  async function markNoBitterballen(venue: ReviewVenue) {
    setBusy((prev) => new Set(prev).add(venue.osm_id));
    setStatus(null);
    try {
      const res = await fetch("/api/admin/discover/no-bitterballen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osm_id: venue.osm_id, name: venue.name, address: venue.address, lat: venue.lat, lng: venue.lng, website: venue.website }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setVenues((prev) => prev?.filter((v) => v.osm_id !== venue.osm_id) ?? []);
      setStatus(`✓ "${venue.name}" added as no-bitterballen bar`);
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy((prev) => { const s = new Set(prev); s.delete(venue.osm_id); return s; });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">review scraped prices</h1>
          {venues !== null && !loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {venues.length} venue{venues.length !== 1 ? "s" : ""} with prices found by scraper
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? "loading…" : "↻ refresh"}
        </button>
      </div>

      {status && (
        <div className={`text-sm px-3 py-2 rounded-lg ${status.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {status}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">loading…</div>
      ) : venues?.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          no prices awaiting review — run <code className="bg-gray-100 px-1 rounded">node --env-file=.env.local scripts/scrape-prices.mjs</code> to find more
        </div>
      ) : (
        <div className="space-y-3">
          {venues!.map((v) => {
            const pp = perPiece(v.osm_id);
            const isBusy = busy.has(v.osm_id);
            return (
              <div key={v.osm_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {v.address ?? "no address"} · {v.amenity}
                    </p>
                  </div>
                  {v.website && (
                    <a
                      href={v.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-500 hover:underline shrink-0"
                    >
                      {v.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>

                {/* Scraped context */}
                {v.scrape_context && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono leading-relaxed">
                    …{v.scrape_context.trim()}…
                  </p>
                )}

                {/* Price edit + actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={edits.get(v.osm_id)?.euro ?? ""}
                      onChange={(e) => setEdit(v.osm_id, "euro", e.target.value)}
                      className="w-20 text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-orange-400"
                    />
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={edits.get(v.osm_id)?.qty ?? ""}
                      onChange={(e) => setEdit(v.osm_id, "qty", e.target.value)}
                      className="w-14 text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-orange-400"
                    />
                    {pp && <span className="text-sm text-orange-500 font-semibold">{pp}</span>}
                  </div>
                  <div className="flex gap-2 ml-auto flex-wrap justify-end">
                    <button
                      onClick={() => skip(v)}
                      disabled={isBusy}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      skip
                    </button>
                    <button
                      onClick={() => markNoBitterballen(v)}
                      disabled={isBusy}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                    >
                      no bitterballen
                    </button>
                    <button
                      onClick={() => approve(v)}
                      disabled={isBusy}
                      className="text-xs bg-orange-500 text-white px-4 py-1.5 rounded-full font-semibold hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40"
                    >
                      {isBusy ? "saving…" : "approve"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
