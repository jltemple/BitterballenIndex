import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { barCell, neighborhoodFromLatLng } from "@/lib/h3-server";

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { name, address, lat, lng, website } = body;
  // neighborhood comes from the form but we re-derive it server-side from coords
  let { neighborhood } = body as { neighborhood: string | null };

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Auto-compute H3 cell and neighbourhood from coordinates if provided
  let h3_cell: string | null = null;
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    h3_cell = barCell(lat, lng);
    // Server-side neighbourhood derivation overrides whatever the client sent
    neighborhood = neighborhoodFromLatLng(lat, lng) ?? neighborhood ?? null;
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("bars")
    .insert({ name, address, neighborhood, lat, lng, h3_cell, website })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
