import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";
import { notifyBarApproved } from "@/lib/discord";

interface ApproveBody {
  id: string;
  osm_id?: number | null;
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
  const { id, osm_id, name, address, lat, lng, website, price_euro, quantity } = body;

  if (!id || !name || price_euro <= 0) {
    return NextResponse.json({ error: "id, name, and price_euro required" }, { status: 400 });
  }

  const db = createServiceClient();
  const neighborhood = neighborhoodFromLatLng(lat, lng) ?? null;

  // Insert bar
  const { data: bar, error: barError } = await db
    .from("bars")
    .insert({ osm_id: osm_id ?? null, name, address, lat, lng, website, neighborhood })
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

  // Mark submission as imported
  await db.from("venue_submissions").update({ status: "imported" }).eq("id", id);

  // Fetch neighbourhood average for Discord context (best-effort, non-blocking)
  let neighbourhoodAvgCents: number | null = null;
  if (neighborhood) {
    const { data: neighbourPrices } = await db
      .from("bars")
      .select("id, prices(price_cents, quantity, recorded_at)")
      .eq("neighborhood", neighborhood)
      .eq("has_bitterballen", true)
      .neq("id", bar.id);

    if (neighbourPrices) {
      const perPieceValues: number[] = [];
      for (const b of neighbourPrices) {
        const sorted = (b.prices as { price_cents: number; quantity: number; recorded_at: string }[])
          .sort((a, z) => z.recorded_at.localeCompare(a.recorded_at));
        if (sorted[0]) perPieceValues.push(sorted[0].price_cents / sorted[0].quantity);
      }
      if (perPieceValues.length > 0) {
        neighbourhoodAvgCents = Math.round(perPieceValues.reduce((a, b) => a + b, 0) / perPieceValues.length);
      }
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bitterballenindex.nl";
  notifyBarApproved({
    name,
    address,
    neighbourhood: neighborhood,
    priceCents: Math.round(price_euro * 100),
    quantity,
    neighbourhoodAvgCents,
    barId: bar.id,
    siteUrl,
  });

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/map`);
  }

  return NextResponse.json({ ok: true, bar_id: bar.id }, { status: 201 });
}
