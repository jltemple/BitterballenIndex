"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";

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

export default function SubmitPage() {
  const t = useTranslations("submit");

  const [form, setForm] = useState({
    bar_name: "",
    address: "",
    lat: "",
    lng: "",
    website: "",
    price_euro: "",
    quantity: "6",
    notes: "",
    _hp: "", // honeypot — must stay empty
  });
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setForm((f) => ({ ...f, bar_name: value }));
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
    setForm((f) => ({ ...f, bar_name: s.name || f.bar_name, address, lat: s.lat, lng: s.lon }));
    setSuggestions([]);
  }

  function perPiece(): string | null {
    const euro = parseFloat(form.price_euro);
    const qty = parseInt(form.quantity || "6", 10);
    if (isNaN(euro) || euro <= 0 || isNaN(qty) || qty <= 0) return null;
    return `€${(euro / qty).toFixed(2)}${t("perPieceSuffix")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitState("loading");
    setErrorMsg("");

    const body = {
      bar_name: form.bar_name.trim(),
      address: form.address.trim(),
      lat: form.lat ? parseFloat(form.lat) : undefined,
      lng: form.lng ? parseFloat(form.lng) : undefined,
      website: form.website.trim() || undefined,
      price_euro: form.price_euro ? parseFloat(form.price_euro) : undefined,
      quantity: form.quantity ? parseInt(form.quantity, 10) : undefined,
      notes: form.notes.trim() || undefined,
      _hp: form._hp,
    };

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSubmitState("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? t("errorGeneric"));
        setSubmitState("error");
      }
    } catch {
      setErrorMsg(t("errorNetwork"));
      setSubmitState("error");
    }
  }

  if (submitState === "success") {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
        <h1 className="text-2xl font-bold text-gray-900">{t("successTitle")}</h1>
        <p className="text-gray-500">{t("successMessage")}</p>
        <button
          onClick={() => {
            setForm({ bar_name: "", address: "", lat: "", lng: "", website: "", price_euro: "", quantity: "6", notes: "", _hp: "" });
            setSubmitState("idle");
          }}
          className="text-sm text-orange-500 hover:underline"
        >
          {t("submitAnother")}
        </button>
      </div>
    );
  }

  const pp = perPiece();

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-gray-500 mt-1 text-sm">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">

        {/* Honeypot — hidden from humans, bots fill it in */}
        <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px] overflow-hidden">
          <label htmlFor="_hp">leave this empty</label>
          <input
            type="text"
            id="_hp"
            name="_hp"
            value={form._hp}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Bar name with Nominatim autocomplete */}
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">
            {t("labelBarName")} <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            name="bar_name"
            value={form.bar_name}
            onChange={handleNameChange}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder={t("placeholderBarName")}
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

        <div>
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">
            {t("labelAddress")} <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder={t("placeholderAddress")}
            required
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">{t("labelWebsite")}</label>
          <input
            type="url"
            name="website"
            value={form.website}
            onChange={handleChange}
            placeholder={t("placeholderWebsite")}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">
            {t("labelPrice")} <span className="text-orange-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-gray-500 text-sm">€</span>
              <input
                type="number"
                name="price_euro"
                value={form.price_euro}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                placeholder={t("placeholderPrice")}
                required
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
              />
            </div>
            <span className="text-gray-400 text-sm">{t("inlineFor")}</span>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              min="1"
              step="1"
              placeholder={t("placeholderQty")}
              className="w-20 bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
            />
            <span className="text-gray-400 text-sm">{t("inlinePcs")}</span>
          </div>
          {pp && <p className="text-xs text-orange-500 font-semibold mt-1.5">{pp}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">{t("labelNotes")}</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            placeholder={t("placeholderNotes")}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400 resize-none"
          />
        </div>

        {submitState === "error" && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={submitState === "loading"}
          className="w-full bg-orange-500 text-white py-2.5 rounded-full font-semibold shadow-sm hover:bg-orange-600 hover:-translate-y-px active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {submitState === "loading" ? t("submitting") : t("submitButton")}
        </button>
      </form>
    </div>
  );
}
