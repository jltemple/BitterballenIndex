"use client";

import { useEffect, useState, useCallback } from "react";

interface OsmVenue {
  id: string;
  osm_id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  website: string | null;
  amenity: string;
}

interface PriceEntry {
  euro: string;
  qty: string;
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const PAGE_SIZE = 20;

export default function DiscoverPage() {
  const [venues, setVenues] = useState<OsmVenue[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prices, setPrices] = useState<Map<string, PriceEntry>>(new Map());
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [nameFilter, setNameFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    setSelected(new Set());
    setPrices(new Map());
    setPage(0);
    try {
      const res = await fetch("/api/admin/discover");
      if (!res.ok) throw new Error(await res.text());
      const { venues: data } = await res.json();
      setVenues(data);
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : e}`);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePageAll() {
    const pageIds = pagedVenues.map((v) => v.id);
    const allChecked = pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      allChecked ? pageIds.forEach((id) => next.delete(id)) : pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function setPrice(id: string, field: "euro" | "qty", value: string) {
    setPrices((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? { euro: "", qty: "6" };
      next.set(id, { ...existing, [field]: value });
      return next;
    });
  }

  function perPiece(entry: PriceEntry | undefined): string | null {
    if (!entry?.euro) return null;
    const euro = parseFloat(entry.euro);
    const qty = parseInt(entry.qty || "6", 10);
    if (isNaN(euro) || isNaN(qty) || qty <= 0) return null;
    return `€${(euro / qty).toFixed(2)}/pc`;
  }

  async function importSelected() {
    if (!venues || selected.size === 0) return;
    setImporting(true);
    setStatus(null);

    const toImport = venues
      .filter((v) => selected.has(v.id))
      .map((v) => {
        const p = prices.get(v.id);
        const euro = parseFloat(p?.euro ?? "");
        const qty = parseInt(p?.qty ?? "6", 10);
        return {
          ...v,
          price_euro: isNaN(euro) ? undefined : euro,
          quantity: isNaN(qty) ? 6 : qty,
        };
      });

    try {
      const res = await fetch("/api/admin/discover/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venues: toImport }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const msg = json.priced > 0
        ? `✓ imported ${json.imported} bar${json.imported !== 1 ? "s" : ""}, ${json.priced} with price`
        : `✓ imported ${json.imported} bar${json.imported !== 1 ? "s" : ""}`;

      setVenues((prev) => prev?.filter((v) => !selected.has(v.id)) ?? []);
      setPrices((prev) => { const next = new Map(prev); selected.forEach((id) => next.delete(id)); return next; });
      setSelected(new Set());
      setPage(0);
      setStatus(msg);
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : e}`);
    } finally {
      setImporting(false);
    }
  }

  async function dismiss(venue: OsmVenue) {
    setVenues((prev) => prev?.filter((v) => v.id !== venue.id) ?? []);
    setSelected((prev) => { const s = new Set(prev); s.delete(venue.id); return s; });
    await fetch("/api/admin/discover/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: venue.id }),
    });
  }

  async function markNoBitterballen(venue: OsmVenue) {
    setVenues((prev) => prev?.filter((v) => v.id !== venue.id) ?? []);
    setSelected((prev) => { const s = new Set(prev); s.delete(venue.id); return s; });
    await fetch("/api/admin/discover/no-bitterballen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: venue.id, osm_id: venue.osm_id, name: venue.name, address: venue.address, lat: venue.lat, lng: venue.lng, website: venue.website }),
    });
    setStatus(`✓ "${venue.name}" added as no-bitterballen bar`);
  }

  const filteredVenues = nameFilter.trim()
    ? (venues ?? []).filter((v) => v.name.toLowerCase().includes(nameFilter.toLowerCase().trim()))
    : (venues ?? []);
  const totalPages = Math.ceil(filteredVenues.length / PAGE_SIZE);
  const pagedVenues = filteredVenues.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageIds = pagedVenues.map((v) => v.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id)) && !allPageSelected;
  const withPrice = [...selected].filter((id) => {
    const p = prices.get(id);
    return p?.euro && !isNaN(parseFloat(p.euro));
  }).length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">discover bars</h1>
          {venues !== null && !loading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {nameFilter.trim() && filteredVenues.length !== venues.length
                ? `${filteredVenues.length} of ${venues.length} venues`
                : `${venues.length} new venues from openstreetmap`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => { setNameFilter(e.target.value); setPage(0); }}
            placeholder="filter by name…"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:border-orange-400 w-44 transition-colors"
          />
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            {loading ? <Spinner className="h-3.5 w-3.5" /> : "↻"} refresh
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`text-sm px-3 py-2 rounded-lg ${status.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {status}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <Spinner className="h-6 w-6 text-orange-400" />
          <p className="text-sm text-gray-400">querying openstreetmap… (may take 5–10 s)</p>
        </div>
      ) : venues?.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          no new venues — all are already imported or dismissed
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-orange-700 font-medium flex-1">
                {selected.size} selected{withPrice > 0 ? `, ${withPrice} with price` : ""}
              </span>
              <button
                onClick={importSelected}
                disabled={importing}
                className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-full font-semibold hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50"
              >
                {importing ? "importing…" : `import ${selected.size}`}
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs tracking-wide">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                      onChange={togglePageAll}
                      className="accent-orange-500"
                    />
                  </th>
                  <th className="text-left px-3 py-3 font-semibold">name</th>
                  <th className="text-left px-3 py-3 font-semibold hidden sm:table-cell">address</th>
                  <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">website</th>
                  <th className="text-left px-3 py-3 font-semibold">price</th>
                  <th className="px-3 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {pagedVenues.map((v) => {
                  const p = prices.get(v.id);
                  const pp = perPiece(p);
                  return (
                    <tr
                      key={v.id}
                      className={`border-b border-gray-100 last:border-0 transition-colors ${
                        selected.has(v.id) ? "bg-orange-50/60" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(v.id)}
                          onChange={() => toggleOne(v.id)}
                          className="accent-orange-500"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-900">{v.name}</p>
                        {v.address && <p className="text-xs text-gray-400 mt-0.5 sm:hidden">{v.address}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell text-xs">
                        {v.address ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        {v.website ? (
                          <a href={v.website} target="_blank" rel="noopener noreferrer"
                            className="text-orange-500 hover:underline text-xs truncate max-w-[160px] block">
                            {v.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">€</span>
                          <input
                            type="number" min="0" step="0.01" placeholder="0.00"
                            value={p?.euro ?? ""}
                            onChange={(e) => {
                              setPrice(v.id, "euro", e.target.value);
                              if (e.target.value) setSelected((s) => new Set(s).add(v.id));
                            }}
                            className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-900 focus:outline-none focus:border-orange-400"
                          />
                          <span className="text-gray-400 text-xs">×</span>
                          <input
                            type="number" min="1" step="1" placeholder="6"
                            value={p?.qty ?? ""}
                            onChange={(e) => setPrice(v.id, "qty", e.target.value)}
                            className="w-10 text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-900 focus:outline-none focus:border-orange-400"
                          />
                          {pp && <span className="text-xs text-orange-500 font-medium w-16">{pp}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => markNoBitterballen(v)} title="no bitterballen — adds as grey dot on map"
                            className="text-xs text-gray-300 hover:text-gray-500 transition-colors whitespace-nowrap">
                            no bb
                          </button>
                          <button onClick={() => dismiss(v)} title="dismiss — won't appear again"
                            className="text-gray-300 hover:text-red-400 transition-colors text-xs">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors">← prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors">next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
