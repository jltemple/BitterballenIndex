import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Get all bars with their most recent price
  const { data, error } = await supabase.rpc("bars_with_latest_price");

  if (error) {
    // Fallback: fetch bars and prices separately if RPC not set up yet
    const { data: bars, error: barsError } = await supabase
      .from("bars")
      .select("*")
      .order("name");

    if (barsError) {
      return NextResponse.json({ error: barsError.message }, { status: 500 });
    }

    const { data: prices } = await supabase
      .from("prices")
      .select("bar_id, price_cents, recorded_at")
      .order("recorded_at", { ascending: false });

    // Attach latest price to each bar
    const latestByBar = new Map<string, { price_cents: number; recorded_at: string }>();
    for (const p of prices ?? []) {
      if (!latestByBar.has(p.bar_id)) {
        latestByBar.set(p.bar_id, { price_cents: p.price_cents, recorded_at: p.recorded_at });
      }
    }

    const result = (bars ?? []).map((bar) => {
      const latest = latestByBar.get(bar.id);
      return {
        ...bar,
        latest_price_cents: latest?.price_cents ?? null,
        latest_recorded_at: latest?.recorded_at ?? null,
      };
    });

    return NextResponse.json(result);
  }

  return NextResponse.json(data);
}
