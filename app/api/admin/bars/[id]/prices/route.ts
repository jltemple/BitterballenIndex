import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id: bar_id } = await params;
  const body = await req.json();

  // Accept price as euro decimal string (total paid for the portion)
  const priceEuro = parseFloat(body.price_euro);
  if (isNaN(priceEuro) || priceEuro <= 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }
  const price_cents = Math.round(priceEuro * 100);

  const quantity = parseInt(body.quantity ?? "6", 10);
  if (isNaN(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const db = createServiceClient();

  // Verify bar exists
  const { data: bar } = await db.from("bars").select("id").eq("id", bar_id).single();
  if (!bar) {
    return NextResponse.json({ error: "Bar not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("prices")
    .insert({
      bar_id,
      price_cents,
      quantity,
      notes: body.notes ?? null,
      recorded_at: body.recorded_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/bars");
  revalidatePath(`/bars/${bar_id}`);
  revalidatePath("/map");

  return NextResponse.json(data, { status: 201 });
}
