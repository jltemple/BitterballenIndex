/**
 * Server-only geo utilities.
 * Do NOT import this in client components.
 */
import { readFileSync } from "fs";
import { join } from "path";

// ─── GeoJSON point-in-polygon ────────────────────────────────────────────────

type GeoFeature = {
  properties: { naam: string };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
};

let _geojsonCache: GeoFeature[] | null = null;

function getNeighbourhoodFeatures(): GeoFeature[] {
  if (_geojsonCache) return _geojsonCache;
  const raw = readFileSync(
    join(process.cwd(), "public/amsterdam-neighborhoods.geojson"),
    "utf-8"
  );
  const parsed = JSON.parse(raw) as { features: GeoFeature[] };
  _geojsonCache = parsed.features;
  return _geojsonCache;
}

/** Ray-casting point-in-polygon for a single ring. GeoJSON coords are [lng, lat]. */
function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Derive the neighbourhood name from coordinates using point-in-polygon
 * against the Amsterdam GeoJSON. No build step required.
 */
export function neighborhoodFromLatLng(lat: number, lng: number): string | null {
  const features = getNeighbourhoodFeatures();
  for (const feature of features) {
    const rings: number[][][] =
      feature.geometry.type === "MultiPolygon"
        ? (feature.geometry.coordinates as number[][][][]).flat(1)
        : (feature.geometry.coordinates as number[][][]);
    if (rings.some((ring) => pointInRing(lat, lng, ring))) {
      return feature.properties.naam;
    }
  }
  return null;
}
