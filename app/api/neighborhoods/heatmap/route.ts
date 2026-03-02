import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Get the latest price per bar, then average by neighborhood
  const { data: prices, error: pricesError } = await supabase
    .from("prices")
    .select("bar_id, price_cents, recorded_at")
    .order("recorded_at", { ascending: false });

  if (pricesError) {
    return NextResponse.json({ error: pricesError.message }, { status: 500 });
  }

  const { data: bars, error: barsError } = await supabase
    .from("bars")
    .select("id, neighborhood")
    .not("neighborhood", "is", null);

  if (barsError) {
    return NextResponse.json({ error: barsError.message }, { status: 500 });
  }

  // Get latest price per bar
  const latestByBar = new Map<string, number>();
  for (const p of prices ?? []) {
    if (!latestByBar.has(p.bar_id)) {
      latestByBar.set(p.bar_id, p.price_cents);
    }
  }

  // Group by neighborhood
  const neighborhoodData = new Map<string, { total: number; count: number }>();
  for (const bar of bars ?? []) {
    if (!bar.neighborhood) continue;
    const price = latestByBar.get(bar.id);
    if (price === undefined) continue;

    const existing = neighborhoodData.get(bar.neighborhood) ?? { total: 0, count: 0 };
    neighborhoodData.set(bar.neighborhood, {
      total: existing.total + price,
      count: existing.count + 1,
    });
  }

  const result = Array.from(neighborhoodData.entries()).map(([neighborhood, { total, count }]) => ({
    neighborhood,
    avg_price_cents: Math.round(total / count),
    bar_count: count,
  }));

  return NextResponse.json(result);
}
