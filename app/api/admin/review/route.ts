import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const db = createServiceClient();

  const { data, error } = await db
    .from("discovered_venues")
    .select("osm_id, name, address, lat, lng, website, amenity, scraped_price_cents, scraped_quantity, scrape_context, last_scraped_at")
    .eq("scrape_status", "price_found")
    .order("last_scraped_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venues: data ?? [], total: data?.length ?? 0 });
}
