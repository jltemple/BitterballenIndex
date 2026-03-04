import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";

interface ApproveBody {
  osm_id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  website: string | null;
  price_euro: number;
  quantity: number;
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = (await req.json()) as ApproveBody;
  const { osm_id, name, address, lat, lng, website, price_euro, quantity } = body;

  if (!osm_id || !name || price_euro <= 0) {
    return NextResponse.json({ error: "osm_id, name, and price_euro required" }, { status: 400 });
  }

  const db = createServiceClient();
  const neighborhood = neighborhoodFromLatLng(lat, lng) ?? null;

  // Insert bar
  const { data: bar, error: barError } = await db
    .from("bars")
    .insert({ osm_id, name, address, lat, lng, website, neighborhood })
    .select("id")
    .single();

  if (barError) {
    return NextResponse.json({ error: barError.message }, { status: 500 });
  }

  // Insert price
  const { error: priceError } = await db.from("prices").insert({
    bar_id: bar.id,
    price_cents: Math.round(price_euro * 100),
    quantity,
  });

  if (priceError) {
    return NextResponse.json({ error: priceError.message }, { status: 500 });
  }

  // Mark as imported in discovered_venues
  await db.from("discovered_venues").update({ scrape_status: "imported" }).eq("osm_id", osm_id);

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/map`);
  }

  return NextResponse.json({ ok: true, bar_id: bar.id }, { status: 201 });
}
