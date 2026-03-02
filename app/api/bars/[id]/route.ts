import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: bar, error: barError } = await supabase
    .from("bars")
    .select("*")
    .eq("id", id)
    .single();

  if (barError || !bar) {
    return NextResponse.json({ error: "Bar not found" }, { status: 404 });
  }

  const { data: prices, error: pricesError } = await supabase
    .from("prices")
    .select("*")
    .eq("bar_id", id)
    .order("recorded_at", { ascending: true });

  if (pricesError) {
    return NextResponse.json({ error: pricesError.message }, { status: 500 });
  }

  return NextResponse.json({ ...bar, prices: prices ?? [] });
}
