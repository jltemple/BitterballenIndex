import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getBarsWithPriceCounts() {
  const { data: bars } = await supabase.from("bars").select("*").order("name");
  const { data: prices } = await supabase
    .from("prices")
    .select("bar_id, price_cents, quantity, recorded_at")
    .order("recorded_at", { ascending: false });

  const latestByBar = new Map<string, { price_cents: number; quantity: number; recorded_at: string }>();
  const countByBar = new Map<string, number>();

  for (const p of prices ?? []) {
    countByBar.set(p.bar_id, (countByBar.get(p.bar_id) ?? 0) + 1);
    if (!latestByBar.has(p.bar_id)) {
      latestByBar.set(p.bar_id, { price_cents: p.price_cents, quantity: p.quantity, recorded_at: p.recorded_at });
    }
  }

  return (bars ?? []).map((bar) => {
    const latest = latestByBar.get(bar.id);
    return {
      ...bar,
      latest_price_cents: latest?.price_cents ?? null,
      latest_quantity: latest?.quantity ?? null,
      price_count: countByBar.get(bar.id) ?? 0,
    };
  });
}

export default async function AdminDashboardPage() {
  const bars = await getBarsWithPriceCounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">bars ({bars.length})</h1>
        <Link
          href="/admin/bars/new"
          prefetch={false}
          className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm hover:bg-orange-600 hover:-translate-y-px active:scale-95 transition-all"
        >
          + add bar
        </Link>
      </div>

      {bars.length === 0 ? (
        <p className="text-gray-500">no bars yet. add the first one!</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">bar</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">neighbourhood</th>
                <th className="text-right px-4 py-3 font-semibold">latest price</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">entries</th>
                <th className="text-right px-4 py-3 font-semibold">actions</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar) => (
                <tr key={bar.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-900">{bar.name}</p>
                    {bar.address && <p className="text-xs text-gray-400 mt-0.5">{bar.address}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">
                    {bar.neighborhood ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-orange-500">
                    {bar.latest_price_cents != null && bar.latest_quantity != null
                      ? `€${(bar.latest_price_cents / bar.latest_quantity / 100).toFixed(2)}/pc`
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-400 hidden md:table-cell">
                    {bar.price_count}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/bars/${bar.id}/price`}
                        prefetch={false}
                        className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-full hover:bg-orange-100 transition-colors"
                      >
                        + price
                      </Link>
                      <Link
                        href={`/admin/bars/${bar.id}/edit`}
                        prefetch={false}
                        className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 hover:text-gray-900 transition-colors"
                      >
                        edit
                      </Link>
                    </div>
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
