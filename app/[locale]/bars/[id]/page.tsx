export const revalidate = false; // cache indefinitely, invalidate via revalidatePath()

import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import { getTranslations } from "next-intl/server";

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

export async function generateStaticParams() {
  const { data } = await supabase.from("bars").select("id");
  return (data ?? []).map(({ id }) => ({ id }));
}

export default async function BarDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const bar = await getBarWithPrices(id);

  if (!bar) notFound();

  const t = await getTranslations("barDetail");

  const latest = bar.prices[bar.prices.length - 1];
  const latestPerPiece = latest ? latest.price_cents / latest.quantity / 100 : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/bars" prefetch={false} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{t("backLink")}</Link>
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
              {t("website")}
            </a>
          )}
        </div>
      </div>

      {/* Latest price */}
      {latest && latestPerPiece !== null && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-gray-500 tracking-wide mb-2">{t("currentPrice")}</p>
            <p className="text-4xl font-extrabold text-orange-500">
              €{latestPerPiece.toFixed(2)}
              <span className="text-2xl font-semibold text-orange-400">{t("perPieceSuffix")}</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t("forQuantity", { price: (latest.price_cents / 100).toFixed(2), quantity: latest.quantity })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("recordedOn", { date: new Date(latest.recorded_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) })}
            </p>
          </div>
          <div className="text-5xl opacity-80">🍡</div>
        </div>
      )}

      {/* Price history chart */}
      {bar.prices.length >= 2 ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("priceHistory")}</h2>
          <PriceHistoryChart prices={bar.prices} />
        </div>
      ) : bar.prices.length === 1 ? (
        <p className="text-sm text-gray-500">{t("oneEntryHint")}</p>
      ) : (
        <p className="text-sm text-gray-500">{t("noPricesYet")}</p>
      )}

      {/* All prices table */}
      {bar.prices.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("allEntries")}</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">{t("colDate")}</th>
                  <th className="text-right px-4 py-3 font-semibold">{t("colPerPiece")}</th>
                  <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">{t("colTotal")}</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">{t("colNotes")}</th>
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
