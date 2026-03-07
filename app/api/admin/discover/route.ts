import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const db = createServiceClient();

  // Automation-sourced venues that haven't been scraped yet or had no price found
  // (price_found venues go to the Review tab instead)
  const { data, error } = await db
    .from("venue_submissions")
    .select("id, osm_id, name, address, lat, lng, website, amenity")
    .eq("source", "automation")
    .in("status", ["pending", "no_price"])
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venues: data ?? [], total: data?.length ?? 0 });
}
