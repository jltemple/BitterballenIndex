import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const db = createServiceClient();

  // Show automation venues with a scraped price found, plus all pending community submissions
  const { data, error } = await db
    .from("venue_submissions")
    .select("id, osm_id, name, address, lat, lng, website, amenity, source, price_cents, quantity, context, updated_at, submitter_name, submitter_email")
    .or("status.eq.price_found,and(source.eq.community,status.eq.pending)")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ venues: data ?? [], total: data?.length ?? 0 });
}
