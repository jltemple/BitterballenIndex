import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { osm_id } = (await req.json()) as { osm_id: number };
  if (!osm_id) {
    return NextResponse.json({ error: "osm_id required" }, { status: 400 });
  }

  const db = createServiceClient();

  // Mark as dismissed in discovered_venues + insert to dismissed_osm_nodes
  // (dismissed_osm_nodes is used by populate-venues.mjs to skip on next run)
  await Promise.all([
    db.from("discovered_venues").update({ scrape_status: "dismissed" }).eq("osm_id", osm_id),
    db.from("dismissed_osm_nodes").upsert({ osm_id }, { onConflict: "osm_id", ignoreDuplicates: true }),
  ]);

  return NextResponse.json({ ok: true });
}
