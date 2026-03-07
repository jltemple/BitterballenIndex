import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";

interface OsmVenue {
  id: string;
  osm_id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  website: string | null;
  price_euro?: number;
  quantity?: number;
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { venues } = (await req.json()) as { venues: OsmVenue[] };
  if (!Array.isArray(venues) || venues.length === 0) {
    return NextResponse.json({ error: "No venues provided" }, { status: 400 });
  }

  const db = createServiceClient();

  const barRows = venues.map((v) => ({
    osm_id: v.osm_id,
    name: v.name,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    website: v.website,
    neighborhood: neighborhoodFromLatLng(v.lat, v.lng) ?? null,
  }));

  const { data: insertedBars, error: barError } = await db
    .from("bars")
    .insert(barRows)
    .select("id, osm_id");

  if (barError) {
    return NextResponse.json({ error: barError.message }, { status: 500 });
  }

  // Insert prices for venues that have one
  const osmIdToBarId = new Map((insertedBars ?? []).map((b) => [b.osm_id, b.id]));
  const priceRows = venues
    .filter((v) => v.price_euro != null && v.price_euro > 0)
    .map((v) => ({
      bar_id: osmIdToBarId.get(v.osm_id),
      price_cents: Math.round(v.price_euro! * 100),
      quantity: v.quantity ?? 6,
    }))
    .filter((r) => r.bar_id != null);

  if (priceRows.length > 0) {
    await db.from("prices").insert(priceRows);
  }

  // Mark as imported in venue_submissions
  const importedIds = venues.map((v) => v.id);
  await db.from("venue_submissions").update({ status: "imported" }).in("id", importedIds);

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/map`);
  }

  return NextResponse.json(
    { imported: insertedBars?.length ?? 0, priced: priceRows.length },
    { status: 201 }
  );
}
