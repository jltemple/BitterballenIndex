"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type NominatimResult = {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function NewBarPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", address: "", neighborhood: "", lat: "", lng: "", website: "",
  });
  const [neighborhoodStatus, setNeighborhoodStatus] = useState<"idle" | "detecting" | "found" | "miss">("idle");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setForm((f) => ({ ...f, name: value }));
    clearTimeout(searchTimer.current);
    if (value.length < 2) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const q = encodeURIComponent(value + " amsterdam");
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=6&countrycodes=nl`,
          { headers: { "Accept-Language": "en" } }
        );
        setSuggestions(await res.json());
      } catch { setSuggestions([]); }
    }, 400);
  }

  function pickSuggestion(s: NominatimResult) {
    const road = [s.address.road, s.address.house_number].filter(Boolean).join(" ");
    const city = s.address.city ?? s.address.town ?? s.address.village ?? "Amsterdam";
    const address = [road, city].filter(Boolean).join(", ");
    const lat = s.lat;
    const lng = s.lon;
    setForm((f) => ({ ...f, name: s.name || f.name, address, lat, lng }));
    setSuggestions([]);
    detectNeighborhoodFromCoords(parseFloat(lat), parseFloat(lng));
  }

  async function detectNeighborhoodFromCoords(lat: number, lng: number) {
    if (isNaN(lat) || isNaN(lng)) return;
    setNeighborhoodStatus("detecting");
    try {
      const res = await fetch(`/api/h3/neighborhood?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.neighborhood) {
        setForm((f) => ({ ...f, neighborhood: data.neighborhood }));
        setNeighborhoodStatus("found");
      } else {
        setNeighborhoodStatus("miss");
      }
    } catch {
      setNeighborhoodStatus("miss");
    }
  }

  async function detectNeighborhood() {
    await detectNeighborhoodFromCoords(parseFloat(form.lat), parseFloat(form.lng));
  }

  async function geocodeAddress() {
    const q = form.address.trim();
    if (!q) return;
    setGeocoding(true);
    try {
      const query = q.toLowerCase().includes("amsterdam") ? q : `${q}, Amsterdam`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1&countrycodes=nl`,
        { headers: { "Accept-Language": "en" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const r = results[0];
        setForm((f) => ({ ...f, lat: r.lat, lng: r.lon }));
        detectNeighborhoodFromCoords(parseFloat(r.lat), parseFloat(r.lon));
      }
    } catch {
      // silently fail — admin can enter coords manually
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const body = {
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
    };
    const res = await fetch("/api/admin/bars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      const bar = await res.json();
      router.push(`/admin/bars/${bar.id}/price`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← dashboard</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">add new bar</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">

        {/* Bar name with Nominatim autocomplete */}
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">bar name *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleNameChange}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder="start typing a bar name…"
            required
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  onMouseDown={() => pickSuggestion(s)}
                  className="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                >
                  <p className="font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.display_name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Address with geocode button */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">address *</label>
          <div className="flex gap-2">
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Leidseplein 12, Amsterdam"
              required
              className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={geocodeAddress}
              disabled={!form.address.trim() || geocoding}
              title="look up coordinates from this address"
              className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              {geocoding ? <Spinner className="h-3.5 w-3.5" /> : "locate →"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="latitude" name="lat" value={form.lat} onChange={handleChange} onBlur={detectNeighborhood} placeholder="52.3676" />
          <Field label="longitude" name="lng" value={form.lng} onChange={handleChange} onBlur={detectNeighborhood} placeholder="4.9041" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 tracking-wide">neighbourhood</label>
            {neighborhoodStatus === "detecting" && <span className="text-xs text-orange-500">detecting…</span>}
            {neighborhoodStatus === "found" && <span className="text-xs text-green-600">✓ auto-detected</span>}
            {neighborhoodStatus === "miss" && <span className="text-xs text-red-500">outside amsterdam — enter manually</span>}
          </div>
          <input
            type="text"
            name="neighborhood"
            value={form.neighborhood}
            onChange={handleChange}
            placeholder="auto-filled from location"
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
          />
        </div>

        <Field label="website" name="website" value={form.website} onChange={handleChange} placeholder="https://example.com" type="url" />

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2.5 rounded-full font-semibold shadow-sm hover:bg-orange-600 hover:-translate-y-px active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? "saving…" : "add bar →"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label, name, value, onChange, onBlur, placeholder, required, type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
      />
    </div>
  );
}
