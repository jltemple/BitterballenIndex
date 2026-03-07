import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { neighborhoodFromLatLng } from "@/lib/h3-server";

interface SubmissionBody {
  bar_name: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string;
  price_euro?: number;
  quantity?: number;
  notes?: string;
  submitter_name?: string;
  submitter_email?: string;
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
    submitter_name,
    submitter_email,
  } = body;

  if (!bar_name?.trim()) {
    return NextResponse.json({ error: "bar_name is required" }, { status: 400 });
  }

  if (price_euro != null && price_euro <= 0) {
    return NextResponse.json({ error: "price_euro must be greater than 0" }, { status: 400 });
  }

  const neighborhood =
    lat != null && lng != null ? (neighborhoodFromLatLng(lat, lng) ?? null) : null;

  const price_cents =
    price_euro != null && price_euro > 0 ? Math.round(price_euro * 100) : null;

  const db = createServiceClient();

  const { data, error } = await db
    .from("venue_submissions")
    .insert({
      name: bar_name.trim(),
      address: address?.trim() || null,
      lat: lat ?? null,
      lng: lng ?? null,
      neighborhood,
      website: website?.trim() || null,
      price_cents,
      quantity: quantity ?? 6,
      context: notes?.trim() || null,
      submitter_name: submitter_name?.trim() || null,
      submitter_email: submitter_email?.trim() || null,
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
