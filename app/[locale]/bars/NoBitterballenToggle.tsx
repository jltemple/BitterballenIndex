"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

interface Bar {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
}

export default function NoBitterballenToggle() {
  const [open, setOpen] = useState(false);
  const [bars, setBars] = useState<Bar[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    // Fetch once on first open
    if (!open && bars === null) {
      setLoading(true);
      try {
        const res = await fetch("/api/bars/no-bitterballen");
        const { bars: data } = await res.json();
        setBars(data);
      } finally {
        setLoading(false);
      }
    }
    setOpen((o) => !o);
  }

  const count = bars?.length ?? null;

  return (
    <div className="mt-4">
      <button
        onClick={handleToggle}
        disabled={loading}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
      >
        <span>{open ? "▾" : "▸"}</span>
        {loading
          ? "loading…"
          : open
          ? "hide"
          : count !== null
          ? `show ${count} bar${count !== 1 ? "s" : ""} that don't serve bitterballen`
          : "show bars that don't serve bitterballen"}
      </button>

      {open && bars && bars.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 shadow-sm opacity-60">
          <table className="w-full text-sm">
            <tbody>
              {bars.map((bar) => (
                <tr key={bar.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/bars/${bar.id}`}
                      prefetch={false}
                      className="font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {bar.name}
                    </Link>
                    {bar.address && <p className="text-xs text-gray-400 mt-0.5">{bar.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell text-xs">
                    {bar.neighborhood ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                      no bitterballen
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && bars && bars.length === 0 && (
        <p className="mt-2 text-sm text-gray-400">none recorded yet</p>
      )}
    </div>
  );
}
