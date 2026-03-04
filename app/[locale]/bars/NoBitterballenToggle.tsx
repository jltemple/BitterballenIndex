"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

interface Bar {
  id: string;
  name: string;
  address: string | null;
  neighborhood: string | null;
}

export default function NoBitterballenToggle({ bars }: { bars: Bar[] }) {
  const [open, setOpen] = useState(false);
  if (bars.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5"
      >
        <span>{open ? "▾" : "▸"}</span>
        {open ? "hide" : `show ${bars.length} bar${bars.length !== 1 ? "s" : ""} that don't serve bitterballen`}
      </button>

      {open && (
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
    </div>
  );
}
