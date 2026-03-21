"use client";

import dynamic from "next/dynamic";

const AmsterdamMap = dynamic(() => import("./AmsterdamMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[65vh] bg-gray-100 rounded-xl flex items-center justify-center">
      <p className="text-gray-500">loading map…</p>
    </div>
  ),
});

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
  latest_recorded_at: string | null;
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

export default function MapLoader({ heatmapData, bars, noBitterballenBars = [] }: Props) {
  return <AmsterdamMap heatmapData={heatmapData} bars={bars} noBitterballenBars={noBitterballenBars} />;
}
