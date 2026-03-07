import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";

interface Body {
  id: string;
  osm_id: number | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  website: string | null;
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id, osm_id, name, address, lat, lng, website } = (await req.json()) as Body;
  if (!id || !name) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }

  const db = createServiceClient();
  const neighborhood = neighborhoodFromLatLng(lat, lng) ?? null;

  const { data: bar, error: barError } = await db
    .from("bars")
    .insert({ osm_id: osm_id ?? null, name, address, lat, lng, website, neighborhood, has_bitterballen: false })
    .select("id")
    .single();

  if (barError) {
    return NextResponse.json({ error: barError.message }, { status: 500 });
  }

  // Mark submission as imported + add to dismissed_osm_nodes if it has an OSM id
  const ops: Promise<unknown>[] = [
    db.from("venue_submissions").update({ status: "imported" }).eq("id", id),
  ];
  if (osm_id) {
    ops.push(
      db
        .from("dismissed_osm_nodes")
        .upsert({ osm_id }, { onConflict: "osm_id", ignoreDuplicates: true })
    );
  }
  await Promise.all(ops);

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/map`);
  }

  return NextResponse.json({ ok: true, bar_id: bar.id }, { status: 201 });
}
