import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location?: {
    formatted_address?: string;
    address?: string;
  };
  geocodes?: {
    main?: { latitude: number; longitude: number };
  };
  website?: string;
  categories?: Array<{ name: string }>;
}

export async function GET(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "bar cafe pub";

  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FOURSQUARE_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    query: q,
    ll: "52.373,4.893",
    radius: "8000",
    limit: "50",
    fields: "fsq_id,name,location,geocodes,website,categories",
  });

  const res = await fetch(
    `https://api.foursquare.com/v3/places/search?${params}`,
    {
      headers: { Authorization: apiKey, Accept: "application/json" },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Foursquare API error: ${text}` },
      { status: res.status }
    );
  }

  const data = await res.json();

  const venues = (data.results ?? []).map((r: FoursquarePlace) => ({
    fsq_id: r.fsq_id,
    name: r.name,
    address: r.location?.formatted_address ?? r.location?.address ?? null,
    lat: r.geocodes?.main?.latitude ?? null,
    lng: r.geocodes?.main?.longitude ?? null,
    website: r.website ?? null,
    category: r.categories?.[0]?.name ?? null,
  }));

  return NextResponse.json({ venues });
}
