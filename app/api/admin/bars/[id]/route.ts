import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { barCell, neighborhoodFromLatLng } from "@/lib/h3-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const { name, address, lat, lng, website } = body;
  let { neighborhood } = body as { neighborhood: string | null };

  let h3_cell: string | null = null;
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    h3_cell = barCell(lat, lng);
    neighborhood = neighborhoodFromLatLng(lat, lng) ?? neighborhood ?? null;
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("bars")
    .update({ name, address, neighborhood, lat, lng, h3_cell, website })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/bars");
  revalidatePath(`/bars/${id}`);
  revalidatePath("/map");

  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const db = createServiceClient();
  const { error } = await db.from("bars").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/bars");
  revalidatePath(`/bars/${id}`);
  revalidatePath("/map");

  return NextResponse.json({ ok: true });
}
