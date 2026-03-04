import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const { name, address, lat, lng, website, has_bitterballen } = body;
  let { neighborhood } = body as { neighborhood: string | null };

  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    neighborhood = neighborhoodFromLatLng(lat, lng) ?? neighborhood ?? null;
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("bars")
    .update({ name, address, neighborhood, lat, lng, website, has_bitterballen: has_bitterballen ?? true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/bars/${id}`);
    revalidatePath(`/${locale}/map`);
  }

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

  for (const locale of ["en", "nl"]) {
    revalidatePath(`/${locale}/bars`);
    revalidatePath(`/${locale}/bars/${id}`);
    revalidatePath(`/${locale}/map`);
  }

  return NextResponse.json({ ok: true });
}
