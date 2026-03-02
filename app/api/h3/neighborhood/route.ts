import { NextRequest, NextResponse } from "next/server";
import { neighborhoodFromLatLng, barCell } from "@/lib/h3-server";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  // Basic sanity check: Amsterdam bounding box
  if (lat < 52.2 || lat > 52.5 || lng < 4.7 || lng > 5.1) {
    return NextResponse.json({ error: "Coordinates outside Amsterdam" }, { status: 400 });
  }

  const neighborhood = neighborhoodFromLatLng(lat, lng);
  const cell10 = barCell(lat, lng);

  return NextResponse.json({ neighborhood, cell10 });
}
