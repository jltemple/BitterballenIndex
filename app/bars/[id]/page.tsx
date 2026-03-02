import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PriceHistoryChart from "@/components/PriceHistoryChart";

async function getBarWithPrices(id: string) {
  const { data: bar } = await supabase.from("bars").select("*").eq("id", id).single();
  if (!bar) return null;

  const { data: prices } = await supabase
    .from("prices")
    .select("*")
    .eq("bar_id", id)
    .order("recorded_at", { ascending: true });

  return { ...bar, prices: prices ?? [] };
}

export default async function BarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bar = await getBarWithPrices(id);

  if (!bar) notFound();

  const latest = bar.prices[bar.prices.length - 1];
  const latestPerPiece = latest ? latest.price_cents / latest.quantity / 100 : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bars" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← All Bars</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{bar.name}</h1>
        {bar.address && <p className="text-gray-500 mt-1">{bar.address}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {bar.neighborhood && (
            <span className="text-xs bg-orange-50 border border-orange-200 text-orange-600 px-2.5 py-0.5 rounded-full">
              {bar.neighborhood}
            </span>
          )}
          {bar.website && (
            <a href={bar.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-orange-500 transition-colors">
              Website →
            </a>
          )}
        </div>
      </div>

      {/* Latest price */}
      {latest && latestPerPiece !== null && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Current Price</p>
            <p className="text-4xl font-extrabold text-orange-500">
              €{latestPerPiece.toFixed(2)}
              <span className="text-2xl font-semibold text-orange-400">/pc</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              €{(latest.price_cents / 100).toFixed(2)} for {latest.quantity}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Recorded {new Date(latest.recorded_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="text-5xl opacity-80">🍡</div>
        </div>
      )}

      {/* Price history chart */}
      {bar.prices.length >= 2 ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Price History</h2>
          <PriceHistoryChart prices={bar.prices} />
        </div>
      ) : bar.prices.length === 1 ? (
        <p className="text-sm text-gray-500">Only one price entry — add more to see history.</p>
      ) : (
        <p className="text-sm text-gray-500">No prices recorded yet.</p>
      )}

      {/* All prices table */}
      {bar.prices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">All Entries</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-right px-4 py-3 font-semibold">Per Piece</th>
                  <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Total</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[...bar.prices].reverse().map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(p.recorded_at).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-orange-500">
                      €{(p.price_cents / p.quantity / 100).toFixed(2)}/pc
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                      €{(p.price_cents / 100).toFixed(2)} ×{p.quantity}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
