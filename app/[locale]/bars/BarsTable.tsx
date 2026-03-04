"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

interface Bar {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
  latest_price_cents: number | null;
  latest_quantity: number | null;
  latest_recorded_at: string | null;
}

type SortField = "price" | "name";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

function formatPerPiece(priceCents: number | null, quantity: number | null) {
  if (priceCents === null || quantity === null) return "—";
  return `€${(priceCents / quantity / 100).toFixed(2)}/pc`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  bars: Bar[];
  // translated column headers passed from server component
  colBar: string;
  colNeighbourhood: string;
  colPerPiece: string;
  colRecorded: string;
}

export default function BarsTable({ bars, colBar, colNeighbourhood, colPerPiece, colRecorded }: Props) {
  const [sortField, setSortField] = useState<SortField>("price");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(0);
  }

  const sorted = [...bars].sort((a, b) => {
    if (sortField === "price") {
      const aP =
        a.latest_price_cents != null && a.latest_quantity != null
          ? a.latest_price_cents / a.latest_quantity
          : Infinity;
      const bP =
        b.latest_price_cents != null && b.latest_quantity != null
          ? b.latest_price_cents / b.latest_quantity
          : Infinity;
      return sortDir === "asc" ? aP - bP : bP - aP;
    }
    return sortDir === "asc"
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <span className="ml-1 text-gray-300">↕</span>;
    return (
      <span className="ml-1 text-orange-500">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  {colBar}
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                {colNeighbourhood}
              </th>
              <th className="text-right px-4 py-3 font-semibold">
                <button
                  onClick={() => handleSort("price")}
                  className="flex items-center ml-auto hover:text-gray-900 transition-colors"
                >
                  {colPerPiece}
                  <SortIcon field="price" />
                </button>
              </th>
              <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">
                {colRecorded}
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((bar) => (
              <tr
                key={bar.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <Link
                    href={`/bars/${bar.id}`}
                    prefetch={false}
                    className="font-medium text-gray-900 hover:text-orange-500 transition-colors"
                  >
                    {bar.name}
                  </Link>
                  {bar.address && (
                    <p className="text-xs text-gray-400 mt-0.5">{bar.address}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                  {bar.neighborhood ?? "—"}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-orange-500">
                  {formatPerPiece(bar.latest_price_cents, bar.latest_quantity)}
                </td>
                <td className="px-4 py-3.5 text-right text-gray-400 hidden md:table-cell text-xs">
                  {formatDate(bar.latest_recorded_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {sorted.length} bars &middot; page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              ← prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
