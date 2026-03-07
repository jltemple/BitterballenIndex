"use client";

import { useEffect, useState, useCallback } from "react";

interface ReviewVenue {
  id: string;
  osm_id: number | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  website: string | null;
  amenity: string | null;
  source: "automation" | "community";
  price_cents: number | null;
  quantity: number;
  context: string | null;
  updated_at: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
}

interface EditedPrice {
  euro: string;
  qty: string;
}

export default function ReviewPage() {
  const [venues, setVenues] = useState<ReviewVenue[] | null>(null);
  const [edits, setEdits] = useState<Map<string, EditedPrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/review");
      const { venues: data } = await res.json();
      setVenues(data);
      // Pre-fill edits from existing price data (automation venues only)
      const map = new Map<string, EditedPrice>();
      for (const v of data ?? []) {
        map.set(v.id, {
          euro: v.price_cents ? (v.price_cents / 100).toFixed(2) : "",
          qty: String(v.quantity ?? 6),
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

  function setEdit(id: string, field: "euro" | "qty", value: string) {
    setEdits((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? { euro: "", qty: "6" };
      next.set(id, { ...existing, [field]: value });
      return next;
    });
  }

  function perPiece(id: string): string | null {
    const p = edits.get(id);
    if (!p?.euro) return null;
    const euro = parseFloat(p.euro);
    const qty = parseInt(p.qty || "6", 10);
    if (isNaN(euro) || isNaN(qty) || qty <= 0) return null;
    return `€${(euro / qty).toFixed(2)}/pc`;
  }

  async function approve(venue: ReviewVenue) {
    const p = edits.get(venue.id);
    const euro = parseFloat(p?.euro ?? "");
    const qty = parseInt(p?.qty ?? "6", 10);
    if (isNaN(euro) || euro <= 0) {
      setStatus("Enter a valid price before approving.");
      return;
    }

    setBusy((prev) => new Set(prev).add(venue.id));
    setStatus(null);

    try {
      const res = await fetch("/api/admin/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: venue.id,
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
      setVenues((prev) => prev?.filter((v) => v.id !== venue.id) ?? []);
      setStatus(`✓ "${venue.name}" approved and added to bars`);
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy((prev) => { const s = new Set(prev); s.delete(venue.id); return s; });
    }
  }

  async function skip(venue: ReviewVenue) {
    setBusy((prev) => new Set(prev).add(venue.id));
    await fetch("/api/admin/discover/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: venue.id }),
    });
    setVenues((prev) => prev?.filter((v) => v.id !== venue.id) ?? []);
    setBusy((prev) => { const s = new Set(prev); s.delete(venue.id); return s; });
  }

  async function markNoBitterballen(venue: ReviewVenue) {
    setBusy((prev) => new Set(prev).add(venue.id));
    setStatus(null);
    try {
      const res = await fetch("/api/admin/discover/no-bitterballen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: venue.id,
          osm_id: venue.osm_id,
          name: venue.name,
          address: venue.address,
          lat: venue.lat,
          lng: venue.lng,
          website: venue.website,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setVenues((prev) => prev?.filter((v) => v.id !== venue.id) ?? []);
      setStatus(`✓ "${venue.name}" added as no-bitterballen bar`);
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy((prev) => { const s = new Set(prev); s.delete(venue.id); return s; });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">review submissions</h1>
          {venues !== null && !loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {venues.length} venue{venues.length !== 1 ? "s" : ""} pending review
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
          no submissions awaiting review — run <code className="bg-gray-100 px-1 rounded">node --env-file=.env.local scripts/scrape-prices.mjs</code> to find more, or share the public submit form
        </div>
      ) : (
        <div className="space-y-3">
          {venues!.map((v) => {
            const pp = perPiece(v.id);
            const isBusy = busy.has(v.id);
            const isCommunity = v.source === "community";
            return (
              <div key={v.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{v.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isCommunity
                          ? "bg-blue-50 text-blue-600"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {isCommunity ? "community" : "scraper"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {v.address ?? "no address"}{v.amenity ? ` · ${v.amenity}` : ""}
                    </p>
                    {isCommunity && (v.submitter_name || v.submitter_email) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        submitted by {v.submitter_name ?? v.submitter_email}
                        {v.submitter_name && v.submitter_email && ` (${v.submitter_email})`}
                      </p>
                    )}
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

                {/* Context (scrape excerpt or community notes) */}
                {v.context && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono leading-relaxed">
                    …{v.context.trim()}…
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
                      value={edits.get(v.id)?.euro ?? ""}
                      onChange={(e) => setEdit(v.id, "euro", e.target.value)}
                      className="w-20 text-sm border border-gray-200 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-orange-400"
                    />
                    <span className="text-xs text-gray-400">×</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={edits.get(v.id)?.qty ?? ""}
                      onChange={(e) => setEdit(v.id, "qty", e.target.value)}
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
