"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function SubmitPricePage() {
  const router = useRouter();
  const params = useParams();
  const barId = params.id as string;

  const [barName, setBarName] = useState("");
  const [form, setForm] = useState({
    price_euro: "",
    quantity: "6",
    notes: "",
    recorded_at: new Date().toISOString().split("T")[0],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/bars/${barId}`)
      .then((r) => r.json())
      .then((data) => setBarName(data.name ?? ""))
      .catch(() => {});
  }, [barId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  const priceEuro = parseFloat(form.price_euro);
  const qty = parseInt(form.quantity, 10);
  const perPiece = !isNaN(priceEuro) && !isNaN(qty) && qty > 0
    ? (priceEuro / qty).toFixed(2)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/admin/bars/${barId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price_euro: form.price_euro,
        quantity: form.quantity,
        notes: form.notes || null,
        recorded_at: new Date(form.recorded_at).toISOString(),
      }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/admin");
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    }
  }

  return (
    <div className="max-w-sm">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← dashboard</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">submit price</h1>
        {barName && <p className="text-gray-500 text-sm mt-1">{barName}</p>}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">

        {/* Total price + quantity row */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">
              total price paid *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400 text-sm">€</span>
              <input
                type="number"
                name="price_euro"
                value={form.price_euro}
                onChange={handleChange}
                required
                step="0.01"
                min="0.01"
                placeholder="15.00"
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-7 pr-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="w-20">
            <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">
              for
            </label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              required
              min="1"
              placeholder="6"
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm text-center focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Live per-piece calc */}
        {perPiece !== null ? (
          <p className="text-sm text-orange-500 font-semibold">
            → €{perPiece}/pc
            <span className="text-gray-400 font-normal ml-1">per piece</span>
          </p>
        ) : (
          <p className="text-sm text-gray-400">enter price and quantity to see per-piece cost</p>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">date</label>
          <input
            type="date"
            name="recorded_at"
            value={form.recorded_at}
            onChange={handleChange}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-2">notes</label>
          <input
            type="text"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="e.g. happy hour price"
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400"
          />
        </div>

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
          {loading ? "saving…" : "save price"}
        </button>
      </form>
    </div>
  );
}
