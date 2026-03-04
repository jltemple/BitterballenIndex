export const revalidate = false; // cache indefinitely, invalidate via revalidatePath()

import { supabase } from "@/lib/supabase";
import MapLoader from "@/components/MapLoader";
import { getTranslations } from "next-intl/server";

async function getMapData() {
  const { data: prices } = await supabase
    .from("prices")
    .select("bar_id, price_cents, quantity, recorded_at")
    .order("recorded_at", { ascending: false });

  const { data: bars } = await supabase
    .from("bars")
    .select("id, name, neighborhood, lat, lng, has_bitterballen")
    .not("lat", "is", null)
    .not("lng", "is", null);

  // Latest price + quantity per bar
  const latestByBar = new Map<string, { price_cents: number; quantity: number }>();
  for (const p of prices ?? []) {
    if (!latestByBar.has(p.bar_id)) {
      latestByBar.set(p.bar_id, { price_cents: p.price_cents, quantity: p.quantity });
    }
  }

  // Neighbourhood heatmap: avg per-piece price — exclude no-bitterballen bars
  const neighborhoodData = new Map<string, { totalPerPiece: number; count: number }>();
  for (const bar of bars ?? []) {
    if (!bar.neighborhood) continue;
    if (!bar.has_bitterballen) continue; // excluded from calculations
    const latest = latestByBar.get(bar.id);
    if (!latest) continue;
    const perPiece = latest.price_cents / latest.quantity;
    const existing = neighborhoodData.get(bar.neighborhood) ?? { totalPerPiece: 0, count: 0 };
    neighborhoodData.set(bar.neighborhood, {
      totalPerPiece: existing.totalPerPiece + perPiece,
      count: existing.count + 1,
    });
  }

  const heatmapData = Array.from(neighborhoodData.entries()).map(([neighborhood, { totalPerPiece, count }]) => ({
    neighborhood,
    avg_price_cents: Math.round(totalPerPiece / count),
    bar_count: count,
  }));

  // Split bars: priced markers vs no-bitterballen grey dots
  const barMarkers = (bars ?? [])
    .filter((bar) => bar.has_bitterballen !== false)
    .map((bar) => {
      const latest = latestByBar.get(bar.id);
      return {
        id: bar.id,
        name: bar.name,
        neighborhood: bar.neighborhood ?? null,
        lat: bar.lat as number,
        lng: bar.lng as number,
        latest_price_cents: latest?.price_cents ?? null,
        latest_quantity: latest?.quantity ?? null,
      };
    });

  const noBitterballenMarkers = (bars ?? [])
    .filter((bar) => bar.has_bitterballen === false)
    .map((bar) => ({
      id: bar.id,
      name: bar.name,
      neighborhood: bar.neighborhood ?? null,
      lat: bar.lat as number,
      lng: bar.lng as number,
    }));

  return { heatmapData, barMarkers, noBitterballenMarkers };
}

export default async function MapPage() {
  const { heatmapData, barMarkers, noBitterballenMarkers } = await getMapData();
  const t = await getTranslations("map");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("description")}</p>
      </div>

      <MapLoader heatmapData={heatmapData} bars={barMarkers} noBitterballenBars={noBitterballenMarkers} />

      {heatmapData.length === 0 && (
        <p className="text-sm text-center text-gray-500">{t("emptyState")}</p>
      )}
    </div>
  );
}
