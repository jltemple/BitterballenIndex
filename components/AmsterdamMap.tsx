"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from "react-leaflet";
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

/** Per-piece price in cents → color tier
 *  Thresholds: €8/6 ≈ 133 cts/pc (good), €9/6 = 150 cts/pc (expensive)
 */
function getPriceColor(perPieceCents: number | undefined): string {
  if (perPieceCents === undefined) return "#d1d5db";
  if (perPieceCents < 133) return "#22c55e";   // < €8.00 for 6
  if (perPieceCents < 150) return "#eab308";   // €8.00 – €9.00 for 6
  return "#ef4444";                             // > €9.00 for 6
}

const LEGEND_COLORS = ["#22c55e", "#eab308", "#ef4444", "#d1d5db"] as const;

export default function AmsterdamMap({ heatmapData, bars, noBitterballenBars = [] }: Props) {
  const t = useTranslations("map");
  const [neighborhoodGeoJson, setNeighborhoodGeoJson] = useState<FeatureCollection | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);

  const legend = [
    { color: LEGEND_COLORS[0], label: t("legendTier1") },
    { color: LEGEND_COLORS[1], label: t("legendTier2") },
    { color: LEGEND_COLORS[2], label: t("legendTier3") },
    { color: LEGEND_COLORS[3], label: t("legendNoData") },
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

  // Base layer style — plain choropleth, no selection highlight (stable reference)
  const styleNeighborhoodBase = useCallback((feature?: Feature) => {
    const name = feature?.properties?.naam ?? "";
    const data = priceByNeighborhood.get(name.toLowerCase());
    return {
      fillColor: getPriceColor(data?.avg_price_cents),
      fillOpacity: data ? 0.45 : 0.15,
      color: "#9ca3af",
      weight: 1,
    };
  }, [priceByNeighborhood]);

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
      setSelectedNeighborhood((prev) => (prev === name ? null : name));
    });
  }, [priceByNeighborhood, t]);

  // Selected neighbourhood as its own FeatureCollection — rendered in a separate top layer
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

  // Only show dots for the selected neighbourhood
  const visibleBars = selectedNeighborhood
    ? bars.filter((b) => b.neighborhood === selectedNeighborhood)
    : [];

  const visibleNoBitterballen = selectedNeighborhood
    ? noBitterballenBars.filter((b) => b.neighborhood === selectedNeighborhood)
    : [];

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
              const total = visibleBars.length + visibleNoBitterballen.length;
              return total > 0
                ? ` · ${visibleBars.length} ${t(visibleBars.length !== 1 ? "barPlural" : "barSingular")}${visibleNoBitterballen.length > 0 ? `, ${visibleNoBitterballen.length} no bb` : ""}`
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
        style={{ height: "65vh", width: "100%", borderRadius: "12px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Base neighbourhood choropleth — stable key, handles click/hover for all polygons */}
        {neighborhoodGeoJson && (
          <GeoJSON
            key="neighborhoods-base"
            data={neighborhoodGeoJson}
            style={styleNeighborhoodBase}
            onEachFeature={onEachNeighborhood}
          />
        )}

        {/* Selected neighbourhood highlight — rendered AFTER base so its border is on top in SVG order.
            pointer-events:none so mouse events fall through to the base layer below. */}
        {selectedFeature && (
          <GeoJSON
            key={`selected-${selectedNeighborhood}`}
            data={selectedFeature}
            style={() => ({
              fillColor: getPriceColor(selectedData?.avg_price_cents),
              fillOpacity: 0.65,
              color: "#fb923c",
              weight: 2.5,
            })}
            onEachFeature={(_, layer) => {
              layer.on("add", () => {
                const el = (layer as L.Path).getElement();
                if (el) el.setAttribute("pointer-events", "none");
              });
            }}
          />
        )}

        {/* No-bitterballen grey dots */}
        {visibleNoBitterballen.map((bar) => (
          <CircleMarker
            key={bar.id}
            center={[bar.lat, bar.lng]}
            radius={5}
            pathOptions={{
              fillColor: "#9ca3af",
              fillOpacity: 0.7,
              color: "#ffffff",
              weight: 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent={false}>
              <strong>{bar.name}</strong>
              <br />
              <span style={{ color: "#9ca3af" }}>no bitterballen</span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Bar dots — rendered last, always on top of both polygon layers */}
        {visibleBars.map((bar) => {
          const perPieceCents =
            bar.latest_price_cents != null && bar.latest_quantity != null
              ? Math.round(bar.latest_price_cents / bar.latest_quantity)
              : undefined;
          const color = getPriceColor(perPieceCents);
          const priceStr =
            perPieceCents != null
              ? `€${(perPieceCents / 100).toFixed(2)}/pc`
              : t("legendNoData");

          return (
            <CircleMarker
              key={bar.id}
              center={[bar.lat, bar.lng]}
              radius={8}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.95,
                color: "#ffffff",
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent={false}>
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
    </div>
  );
}
