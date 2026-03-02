/**
 * Generates public/hex-lookup.json
 *
 * Maps every resolution-8 H3 hex cell covering Amsterdam → neighbourhood name.
 * Also pre-computes cell boundary coordinates so the map never needs h3-js client-side.
 *
 * Run with:  npx tsx scripts/build-hex-lookup.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { polygonToCells, cellToBoundary, latLngToCell } from "h3-js";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";

const NEIGHBORHOOD_RES = 8;
const outputPath = "public/hex-lookup.json";

// ---------------------------------------------------------------------------
// Load GeoJSON
// ---------------------------------------------------------------------------
const geojson = JSON.parse(
  readFileSync("public/amsterdam-neighborhoods.geojson", "utf-8")
) as FeatureCollection;

console.log(`Loaded ${geojson.features.length} neighbourhood features`);

// ---------------------------------------------------------------------------
// Build hex8 → neighbourhood name lookup
// h3-js v4 polygonToCells takes an array-of-rings where each ring is
// [lat, lng][] (H3 convention — opposite of GeoJSON's [lng, lat])
// ---------------------------------------------------------------------------
const hexToNeighborhood: Record<string, string> = {};
const stats: Record<string, number> = {};

for (const feature of geojson.features) {
  const name = (feature.properties?.naam ?? "") as string;
  if (!name) { console.warn("Feature missing naam, skipping"); continue; }

  const geom = feature.geometry;
  // Normalise to array-of-polygons regardless of Polygon / MultiPolygon
  const polygons: number[][][][] =
    geom.type === "Polygon"
      ? [(geom as Polygon).coordinates]
      : (geom as MultiPolygon).coordinates;

  let count = 0;

  for (const polygon of polygons) {
    // Swap each ring from GeoJSON [lng, lat] → H3 [lat, lng]
    const rings = polygon.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as [number, number])
    );

    // containmentMode 2 = intersecting — captures cells that touch the polygon
    // even when the polygon is smaller than one hex cell
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cells = polygonToCells(rings, NEIGHBORHOOD_RES, { containmentMode: 2 } as any);

    for (const cell of cells) {
      hexToNeighborhood[cell] = name; // last writer wins at boundaries — acceptable
      count++;
    }
  }

  // Fallback for features too small to intersect any hex center:
  // map the polygon's centroid cell to this neighbourhood
  if (count === 0) {
    const ring0 =
      geom.type === "Polygon"
        ? (geom as Polygon).coordinates[0]
        : (geom as MultiPolygon).coordinates[0][0];
    const avgLat = ring0.reduce((s, c) => s + c[1], 0) / ring0.length;
    const avgLng = ring0.reduce((s, c) => s + c[0], 0) / ring0.length;
    const centroidCell = latLngToCell(avgLat, avgLng, NEIGHBORHOOD_RES);
    hexToNeighborhood[centroidCell] = name;
    count = 1;
    console.log(`  centroid fallback: "${name}" → ${centroidCell}`);
  }

  stats[name] = count;
}

const uniqueCells = Object.keys(hexToNeighborhood).length;
const covered = Object.values(stats).filter((n) => n > 0).length;

console.log(`\nResults:`);
console.log(`  Neighbourhoods covered : ${covered} / ${geojson.features.length}`);
console.log(`  Unique hex8 cells      : ${uniqueCells}`);
console.log(`  Top 5 largest:`);
Object.entries(stats)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .forEach(([name, n]) => console.log(`    ${String(n).padStart(4)} cells  ${name}`));

// ---------------------------------------------------------------------------
// Pre-compute cell boundary polygons for the map hex layer.
// cellToBoundary returns [lat, lng][] — swap to GeoJSON [lng, lat][].
// ---------------------------------------------------------------------------
type HexCell = {
  cell: string;
  neighborhood: string;
  boundary: [number, number][]; // closed GeoJSON ring [lng, lat]
};

const cells: HexCell[] = Object.entries(hexToNeighborhood).map(([cell, neighborhood]) => {
  const boundary = cellToBoundary(cell).map(
    ([lat, lng]) => [lng, lat] as [number, number]
  );
  boundary.push(boundary[0]); // close the GeoJSON ring
  return { cell, neighborhood, boundary };
});

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const output = {
  /** hex8 cell id → neighbourhood name  (for bar neighbourhood lookup) */
  lookup: hexToNeighborhood,
  /** pre-computed boundaries for the map hex layer */
  cells,
};

const json = JSON.stringify(output);
writeFileSync(outputPath, json);
console.log(`\n✓ Written ${outputPath}  (${(json.length / 1024).toFixed(1)} KB)`);
