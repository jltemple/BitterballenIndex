import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";

interface FoursquareVenue {
  fsq_id: string;
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

  const { venues } = (await req.json()) as { venues: FoursquareVenue[] };
  if (!Array.isArray(venues) || venues.length === 0) {
    return NextResponse.json({ error: "No venues provided" }, { status: 400 });
  }

  const db = createServiceClient();

  const barRows = venues.map((v) => ({
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
    .select("id");

  if (barError) {
    return NextResponse.json({ error: barError.message }, { status: 500 });
  }

  // Insert prices for venues that have one, matched by position
  const priceRows = venues
    .map((v, i) => ({
      bar_id: insertedBars?.[i]?.id,
      price_euro: v.price_euro,
      quantity: v.quantity ?? 6,
    }))
    .filter((r) => r.bar_id != null && r.price_euro != null && r.price_euro > 0)
    .map((r) => ({
      bar_id: r.bar_id,
      price_cents: Math.round(r.price_euro! * 100),
      quantity: r.quantity,
    }));

  if (priceRows.length > 0) {
    await db.from("prices").insert(priceRows);
  }

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/map`);
  }

  return NextResponse.json(
    { imported: insertedBars?.length ?? 0, priced: priceRows.length },
    { status: 201 }
  );
}
