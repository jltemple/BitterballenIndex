export const revalidate = false;

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase
    .from("bars")
    .select("id, name, address, neighborhood")
    .eq("has_bitterballen", false)
    .order("name");

  return NextResponse.json({ bars: data ?? [] });
}
