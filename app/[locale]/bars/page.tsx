export const revalidate = false; // cache indefinitely, invalidate via revalidatePath()

import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";

async function getBarsWithLatestPrice() {
  const { data: bars } = await supabase.from("bars").select("*").order("name");
  const { data: prices } = await supabase
    .from("prices")
    .select("bar_id, price_cents, quantity, recorded_at")
    .order("recorded_at", { ascending: false });

  const latestByBar = new Map<string, { price_cents: number; quantity: number; recorded_at: string }>();
  for (const p of prices ?? []) {
    if (!latestByBar.has(p.bar_id)) {
      latestByBar.set(p.bar_id, { price_cents: p.price_cents, quantity: p.quantity, recorded_at: p.recorded_at });
    }
  }

  return (bars ?? [])
    .map((bar) => {
      const latest = latestByBar.get(bar.id);
      return {
        ...bar,
        latest_price_cents: latest?.price_cents ?? null,
        latest_quantity: latest?.quantity ?? null,
        latest_recorded_at: latest?.recorded_at ?? null,
      };
    })
    .sort((a, b) => {
      const aPerPiece = a.latest_price_cents != null && a.latest_quantity != null
        ? a.latest_price_cents / a.latest_quantity : Infinity;
      const bPerPiece = b.latest_price_cents != null && b.latest_quantity != null
        ? b.latest_price_cents / b.latest_quantity : Infinity;
      return aPerPiece - bPerPiece;
    });
}

function formatPerPiece(priceCents: number | null, quantity: number | null) {
  if (priceCents === null || quantity === null) return "—";
  return `€${(priceCents / quantity / 100).toFixed(2)}/pc`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BarsPage() {
  const bars = await getBarsWithLatestPrice();
  const t = await getTranslations("bars");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("title")}</h1>

      {bars.length === 0 ? (
        <p className="text-gray-500">{t("noBarsYet")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{t("colBar")}</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">{t("colNeighbourhood")}</th>
                <th className="text-right px-4 py-3 font-semibold">{t("colPerPiece")}</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">{t("colRecorded")}</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar) => (
                <tr key={bar.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/bars/${bar.id}`}
                      prefetch={false}
                      className="font-medium text-gray-900 hover:text-orange-500 transition-colors"
                    >
                      {bar.name}
                    </Link>
                    {bar.address && <p className="text-xs text-gray-400 mt-0.5">{bar.address}</p>}
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
      )}
    </div>
  );
}
