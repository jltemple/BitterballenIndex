export const revalidate = false; // cache indefinitely, invalidate via revalidatePath()

import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";
import BarsTable from "./BarsTable";

async function getBarsWithLatestPrice() {
  const { data: bars } = await supabase
    .from("bars")
    .select("*")
    .eq("has_bitterballen", true)
    .order("name");

  const { data: prices } = await supabase
    .from("prices")
    .select("bar_id, price_cents, quantity, recorded_at")
    .order("recorded_at", { ascending: false });

  const latestByBar = new Map<string, { price_cents: number; quantity: number; recorded_at: string }>();
  for (const p of prices ?? []) {
    if (!latestByBar.has(p.bar_id)) {
      latestByBar.set(p.bar_id, {
        price_cents: p.price_cents,
        quantity: p.quantity,
        recorded_at: p.recorded_at,
      });
    }
  }

  return (bars ?? []).map((bar) => {
    const latest = latestByBar.get(bar.id);
    return {
      id: bar.id,
      name: bar.name,
      address: bar.address ?? null,
      neighborhood: bar.neighborhood ?? null,
      latest_price_cents: latest?.price_cents ?? null,
      latest_quantity: latest?.quantity ?? null,
      latest_recorded_at: latest?.recorded_at ?? null,
    };
  });
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
        <Suspense fallback={
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
            loading…
          </div>
        }>
          <BarsTable
            bars={bars}
            colBar={t("colBar")}
            colNeighbourhood={t("colNeighbourhood")}
            colPerPiece={t("colPerPiece")}
            colRecorded={t("colRecorded")}
          />
        </Suspense>
      )}
    </div>
  );
}
