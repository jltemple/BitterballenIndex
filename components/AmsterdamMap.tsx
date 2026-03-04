"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, Pane } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslations } from "next-intl";

interface NeighborhoodPrice {
  neighborhood: string;
  avg_price_cents: number;
  bar_count: number;
}

interface BarMarker {
  id: string;
  name: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  latest_price_cents: number | null;
  latest_quantity: number | null;
}

interface NoBitterballenMarker {
  id: string;
  name: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
}

interface Props {
  heatmapData: NeighborhoodPrice[];
  bars: BarMarker[];
  noBitterballenBars?: NoBitterballenMarker[];
}

/** Thresholds: €8/6 ≈ 133 cts/pc (good), €9/6 = 150 cts/pc (expensive) */
const PALETTES = {
  normal: { cheap: "#22c55e", mid: "#eab308", expensive: "#ef4444", noData: "#d1d5db" },
  // Okabe-Ito — safe for deuteranopia, protanopia, and tritanopia
  cb:     { cheap: "#0072B2", mid: "#E69F00", expensive: "#CC79A7", noData: "#d1d5db" },
} as const;

function getPriceColor(perPieceCents: number | undefined, colorblind: boolean): string {
  const p = colorblind ? PALETTES.cb : PALETTES.normal;
  if (perPieceCents === undefined) return p.noData;
  if (perPieceCents < 133) return p.cheap;
  if (perPieceCents < 150) return p.mid;
  return p.expensive;
}

export default function AmsterdamMap({ heatmapData, bars, noBitterballenBars = [] }: Props) {
  const t = useTranslations("map");
  const [neighborhoodGeoJson, setNeighborhoodGeoJson] = useState<FeatureCollection | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [colorblind, setColorblind] = useState(false);

  // Persist colorblind preference across sessions
  useEffect(() => {
    setColorblind(localStorage.getItem("cb") === "1");
  }, []);
  function toggleColorblind() {
    setColorblind((prev) => {
      const next = !prev;
      localStorage.setItem("cb", next ? "1" : "0");
      return next;
    });
  }

  const palette = colorblind ? PALETTES.cb : PALETTES.normal;
  const legend = [
    { color: palette.cheap,     label: t("legendTier1") },
    { color: palette.mid,       label: t("legendTier2") },
    { color: palette.expensive, label: t("legendTier3") },
    { color: palette.noData,    label: t("legendNoData") },
  ];

  useEffect(() => {
    fetch("/amsterdam-neighborhoods.geojson")
      .then((r) => r.json())
      .then(setNeighborhoodGeoJson)
      .catch(console.error);
  }, []);

  const priceByNeighborhood = useMemo(
    () => new Map(heatmapData.map((d) => [d.neighborhood.toLowerCase(), d])),
    [heatmapData]
  );

  // Base layer — orange borders always, choropleth fill
  const styleNeighborhoodBase = useCallback((feature?: Feature) => {
    const name = feature?.properties?.naam ?? "";
    const data = priceByNeighborhood.get(name.toLowerCase());
    return {
      fillColor: getPriceColor(data?.avg_price_cents, colorblind),
      fillOpacity: data ? 0.45 : 0.15,
      color: "#fb923c",
      weight: 2,
    };
  }, [priceByNeighborhood, colorblind]);

  const onEachNeighborhood = useCallback((feature: Feature, layer: L.Layer) => {
    const name: string = feature.properties?.naam ?? "Unknown";
    const data = priceByNeighborhood.get(name.toLowerCase());
    const barCount = data?.bar_count ?? 0;
    const barWord = t(barCount !== 1 ? "barPlural" : "barSingular");
    const priceStr = data
      ? `€${(data.avg_price_cents / 100).toFixed(2)}/pc ${t("tooltipAvg")} · ${barCount} ${barWord}`
      : t("noDataTooltip");
    (layer as L.Path).bindTooltip(`<strong>${name}</strong><br/>${priceStr}`, { sticky: true });
    layer.on("click", () => {
      // Any click while something is selected → deselect; click when nothing selected → select
      setSelectedNeighborhood((prev) => (prev === null ? name : null));
    });
  }, [priceByNeighborhood, t]);

  // Selected neighbourhood highlight layer
  const selectedFeature = useMemo((): FeatureCollection | null => {
    if (!selectedNeighborhood || !neighborhoodGeoJson) return null;
    return {
      type: "FeatureCollection",
      features: neighborhoodGeoJson.features.filter(
        (f) => f.properties?.naam === selectedNeighborhood
      ),
    };
  }, [selectedNeighborhood, neighborhoodGeoJson]);

  const selectedData = selectedNeighborhood
    ? priceByNeighborhood.get(selectedNeighborhood.toLowerCase())
    : null;

  // Filter dots — all when nothing selected, focused neighbourhood when one is
  const visibleBars = selectedNeighborhood
    ? bars.filter((b) => b.neighborhood === selectedNeighborhood)
    : bars;
  const visibleNoBb = selectedNeighborhood
    ? noBitterballenBars.filter((b) => b.neighborhood === selectedNeighborhood)
    : noBitterballenBars;

  // Count for the status pill
  const selectedBarCount = visibleBars.length;
  const selectedNoBbCount = visibleNoBb.length;

  // World-minus-Amsterdam mask: one giant polygon with every neighbourhood as a hole.
  // Leaflet uses evenodd fill-rule by default, so winding order doesn't matter —
  // the world rectangle is filled, and anything inside a neighbourhood ring is not.
  const maskGeoJson = useMemo((): FeatureCollection | null => {
    if (!neighborhoodGeoJson) return null;
    const holes: number[][][] = [];
    for (const f of neighborhoodGeoJson.features) {
      const g = f.geometry;
      if (g.type === "Polygon") {
        holes.push(g.coordinates[0] as number[][]);
      } else if (g.type === "MultiPolygon") {
        for (const part of g.coordinates) {
          holes.push(part[0] as number[][]);
        }
      }
    }
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]],
              ...holes,
            ],
          },
        } as Feature,
      ],
    };
  }, [neighborhoodGeoJson]);

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl border border-gray-200 p-3 text-xs space-y-1.5 shadow-md">
        <p className="font-semibold text-gray-500 tracking-wide mb-2 text-[10px]">{t("legendTitle")}</p>
        {legend.map(({ color, label }) => (
          <div key={color} className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Selection status / hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
        {selectedNeighborhood ? (
          <div className="bg-white border border-orange-300 text-orange-500 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap">
            {selectedNeighborhood}
            {(() => {
              const total = selectedBarCount + selectedNoBbCount;
              return total > 0
                ? ` · ${selectedBarCount} ${t(selectedBarCount !== 1 ? "barPlural" : "barSingular")}${selectedNoBbCount > 0 ? `, ${selectedNoBbCount} no bb` : ""}`
                : ` · ${t("noBarsRecorded")}`;
            })()}
            <span className="text-gray-400 font-normal ml-1.5">— {t("clickDeselect")}</span>
          </div>
        ) : (
          <div className="bg-white/90 border border-gray-200 text-gray-400 text-xs px-3 py-1.5 rounded-full shadow">
            {t("clickHint")}
          </div>
        )}
      </div>

      <MapContainer
        center={[52.373, 4.893]}
        zoom={12}
        minZoom={11}
        style={{ height: "65vh", width: "100%", borderRadius: "12px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Mask: grays out everything outside Amsterdam. Rendered first so it sits
            below the choropleth in SVG stacking order. interactive=false so it
            never intercepts clicks or hovers. No custom pane needed. */}
        {maskGeoJson && (
          <GeoJSON
            key="mask"
            data={maskGeoJson}
            interactive={false}
            style={() => ({
              fillColor: "#6b7280",
              fillOpacity: 0.42,
              stroke: false,
              weight: 0,
            })}
          />
        )}

        {/* Base neighbourhood choropleth — key includes colorblind to force remount on toggle */}
        {neighborhoodGeoJson && (
          <GeoJSON
            key={`neighborhoods-base-${colorblind}`}
            data={neighborhoodGeoJson}
            style={styleNeighborhoodBase}
            onEachFeature={onEachNeighborhood}
          />
        )}

        {/* Selected neighbourhood highlight — click deselects */}
        {selectedFeature && (
          <GeoJSON
            key={`selected-${selectedNeighborhood}-${colorblind}`}
            data={selectedFeature}
            style={() => ({
              fillColor: getPriceColor(selectedData?.avg_price_cents, colorblind),
              fillOpacity: 0.65,
              color: "#fb923c",
              weight: 3,
            })}
            onEachFeature={(_, layer) => {
              layer.on("click", () => setSelectedNeighborhood(null));
            }}
          />
        )}

        {/* bar-dots: above overlayPane (400); bar-tooltips: above everything */}
        <Pane name="bar-dots" style={{ zIndex: 450 }} />
        <Pane name="bar-tooltips" style={{ zIndex: 800 }} />

        {/* No-bitterballen grey dots — filtered to selected neighbourhood when one is active */}
        {visibleNoBb.map((bar) => (
          <CircleMarker
            key={bar.id}
            pane="bar-dots"
            center={[bar.lat, bar.lng]}
            radius={5}
            pathOptions={{
              fillColor: "#9ca3af",
              fillOpacity: 0.7,
              color: "#ffffff",
              weight: 1.5,
            }}
          >
            <Tooltip pane="bar-tooltips" direction="top" offset={[0, -8]} permanent={false}>
              <strong>{bar.name}</strong>
              <br />
              <span style={{ color: "#9ca3af" }}>no bitterballen</span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Bar dots — filtered to selected neighbourhood when one is active */}
        {visibleBars.map((bar) => {
          const perPieceCents =
            bar.latest_price_cents != null && bar.latest_quantity != null
              ? Math.round(bar.latest_price_cents / bar.latest_quantity)
              : undefined;
          const color = getPriceColor(perPieceCents, colorblind);
          const priceStr =
            perPieceCents != null
              ? `€${(perPieceCents / 100).toFixed(2)}/pc`
              : t("legendNoData");

          return (
            <CircleMarker
              key={bar.id}
              pane="bar-dots"
              center={[bar.lat, bar.lng]}
              radius={8}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.95,
                color: "#ffffff",
                weight: 2,
              }}
            >
              <Tooltip pane="bar-tooltips" direction="top" offset={[0, -10]} permanent={false}>
                <strong>{bar.name}</strong>
                <br />
                {priceStr}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {!neighborhoodGeoJson && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 rounded-xl">
          <p className="text-gray-500">{t("loadingNeighbourhoods")}</p>
        </div>
      )}

      {/* Colorblind mode toggle */}
      <div className="mt-2 flex justify-end">
        <button
          role="switch"
          aria-checked={colorblind}
          onClick={toggleColorblind}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          <span
            className="relative inline-flex h-4 w-7 rounded-full transition-colors duration-200 shrink-0"
            style={{ backgroundColor: colorblind ? "#0072B2" : "#d1d5db" }}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${
                colorblind ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
          colorblind mode
        </button>
      </div>
    </div>
  );
}
