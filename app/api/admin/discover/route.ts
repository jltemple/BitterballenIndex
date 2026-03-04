import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const db = createServiceClient();

  // Read from discovered_venues where scraping found nothing (or not yet scraped)
  // price_found venues go to the Review tab instead
  const { data, error } = await db
    .from("discovered_venues")
    .select("osm_id, name, address, lat, lng, website, amenity")
    .in("scrape_status", ["pending", "no_price"])
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venues: data ?? [], total: data?.length ?? 0 });
}
