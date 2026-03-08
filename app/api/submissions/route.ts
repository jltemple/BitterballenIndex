import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Rough bounding box for Amsterdam + immediate surroundings
const AMSTERDAM_BOUNDS = { latMin: 52.27, latMax: 52.47, lngMin: 4.72, lngMax: 5.08 };

interface SubmissionBody {
  bar_name: string;
  address: string;
  lat?: number;
  lng?: number;
  website?: string;
  price_euro?: number;
  quantity?: number;
  notes?: string;
  _hp?: string; // honeypot — must be empty
}

export async function POST(req: Request) {
  let body: SubmissionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bar_name, address, lat, lng, website, price_euro, quantity, notes, _hp } = body;

  // Honeypot — bots fill hidden fields, humans don't
  if (_hp) {
    return NextResponse.json({ ok: true }, { status: 201 }); // silent discard
  }

  // Required fields
  if (!bar_name?.trim()) {
    return NextResponse.json({ error: "bar_name is required" }, { status: 400 });
  }
  if (!address?.trim()) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }
  if (!price_euro || price_euro <= 0) {
    return NextResponse.json({ error: "price_euro is required and must be greater than 0" }, { status: 400 });
  }

  // Length limits
  if (bar_name.trim().length > 200) {
    return NextResponse.json({ error: "bar_name too long" }, { status: 400 });
  }
  if (address.trim().length > 300) {
    return NextResponse.json({ error: "address too long" }, { status: 400 });
  }
  if (website && website.length > 500) {
    return NextResponse.json({ error: "website too long" }, { status: 400 });
  }
  if (notes && notes.length > 1000) {
    return NextResponse.json({ error: "notes too long (max 1000 chars)" }, { status: 400 });
  }

  // Amsterdam bounds check — only if coords were provided
  if (lat != null && lng != null) {
    if (
      lat < AMSTERDAM_BOUNDS.latMin || lat > AMSTERDAM_BOUNDS.latMax ||
      lng < AMSTERDAM_BOUNDS.lngMin || lng > AMSTERDAM_BOUNDS.lngMax
    ) {
      return NextResponse.json({ error: "Coordinates appear to be outside Amsterdam" }, { status: 400 });
    }
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
