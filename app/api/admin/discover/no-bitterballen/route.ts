import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";

interface Body {
  osm_id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  website: string | null;
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { osm_id, name, address, lat, lng, website } = (await req.json()) as Body;
  if (!osm_id || !name) {
    return NextResponse.json({ error: "osm_id and name required" }, { status: 400 });
  }

  const db = createServiceClient();
  const neighborhood = neighborhoodFromLatLng(lat, lng) ?? null;

  const { data: bar, error: barError } = await db
    .from("bars")
    .insert({ osm_id, name, address, lat, lng, website, neighborhood, has_bitterballen: false })
    .select("id")
    .single();

  if (barError) {
    return NextResponse.json({ error: barError.message }, { status: 500 });
  }

  // Mark in discovered_venues + dismissed_osm_nodes so populate script skips it
  await Promise.all([
    db.from("discovered_venues").update({ scrape_status: "imported" }).eq("osm_id", osm_id),
    db.from("dismissed_osm_nodes").upsert({ osm_id }, { onConflict: "osm_id", ignoreDuplicates: true }),
  ]);

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/map`);
  }

  return NextResponse.json({ ok: true, bar_id: bar.id }, { status: 201 });
}
