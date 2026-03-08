import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = (await req.json()) as { id: string };
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = createServiceClient();

  // Fetch the submission to get its osm_id (may be null for community submissions)
  const { data: submission } = await db
    .from("venue_submissions")
    .select("osm_id")
    .eq("id", id)
    .single();

  await db.from("venue_submissions").update({ status: "dismissed" }).eq("id", id);

  // For automation venues with an OSM id, also record in dismissed_osm_nodes
  // so the populate script skips them on the next run
  if (submission?.osm_id) {
    await db
      .from("dismissed_osm_nodes")
      .upsert({ osm_id: submission.osm_id }, { onConflict: "osm_id", ignoreDuplicates: true });
  }

  return NextResponse.json({ ok: true });
}
