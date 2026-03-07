import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

interface SubmissionBody {
  bar_name: string;
  address: string;
  lat?: number;
  lng?: number;
  website?: string;
  price_euro?: number;
  quantity?: number;
  notes?: string;
}

export async function POST(req: Request) {
  let body: SubmissionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    bar_name,
    address,
    lat,
    lng,
    website,
    price_euro,
    quantity,
    notes,
  } = body;

  if (!bar_name?.trim()) {
    return NextResponse.json({ error: "bar_name is required" }, { status: 400 });
  }

  if (!address?.trim()) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  if (!price_euro || price_euro <= 0) {
    return NextResponse.json({ error: "price_euro is required and must be greater than 0" }, { status: 400 });
  }

  const price_cents = Math.round(price_euro * 100);

  const db = createServiceClient();

  const { data, error } = await db
    .from("venue_submissions")
    .insert({
      name: bar_name.trim(),
      address: address.trim(),
      lat: lat ?? null,
      lng: lng ?? null,
      website: website?.trim() || null,
      price_cents,
      quantity: quantity && quantity > 0 ? quantity : 6,
      context: notes?.trim() || null,
      source: "community",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
