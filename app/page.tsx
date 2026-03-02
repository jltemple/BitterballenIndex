import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getStats() {
  const { data: prices } = await supabase
    .from("prices")
    .select("bar_id, price_cents, quantity, recorded_at")
    .order("recorded_at", { ascending: false });

  const { data: bars } = await supabase.from("bars").select("id, name");

  if (!prices || !bars) return null;

  const latestByBar = new Map<string, { price_cents: number; quantity: number; bar_id: string }>();
  for (const p of prices) {
    if (!latestByBar.has(p.bar_id)) {
      latestByBar.set(p.bar_id, { price_cents: p.price_cents, quantity: p.quantity, bar_id: p.bar_id });
    }
  }

  const activePrices = Array.from(latestByBar.values()).map((p) => ({
    bar_id: p.bar_id,
    per_piece_cents: Math.round(p.price_cents / p.quantity),
  }));

  if (activePrices.length === 0) return { barCount: bars.length, cityAvg: null, cheapest: null, mostExpensive: null };

  const totalPerPiece = activePrices.reduce((sum, p) => sum + p.per_piece_cents, 0);
  const cityAvg = totalPerPiece / activePrices.length;

  const sorted = [...activePrices].sort((a, b) => a.per_piece_cents - b.per_piece_cents);
  const cheapestBar = bars.find((b) => b.id === sorted[0].bar_id);
  const expensiveBar = bars.find((b) => b.id === sorted[sorted.length - 1].bar_id);

  return {
    barCount: bars.length,
    cityAvg,
    cheapest: cheapestBar ? { name: cheapestBar.name, id: cheapestBar.id, per_piece_cents: sorted[0].per_piece_cents } : null,
    mostExpensive: expensiveBar
      ? { name: expensiveBar.name, id: expensiveBar.id, per_piece_cents: sorted[sorted.length - 1].per_piece_cents }
      : null,
  };
}

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2)}/pc`;
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center py-14">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
          Amsterdam · Since 2025
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Bitterballen Index
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          Tracking the price of bitterballen at bars across Amsterdam — so you always know where to get the best deal.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/bars"
            className="bg-orange-500 text-white px-6 py-2.5 rounded-full font-semibold shadow-sm hover:bg-orange-600 hover:-translate-y-px active:scale-95 transition-all"
          >
            Browse Bars
          </Link>
          <Link
            href="/map"
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full font-semibold hover:border-orange-500 hover:bg-orange-50 transition-all"
          >
            View Map
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Bars Tracked" value={stats.barCount.toString()} />
          <StatCard label="City Average" value={stats.cityAvg ? formatPrice(stats.cityAvg) : "—"} />
          <StatCard
            label="Cheapest"
            value={stats.cheapest ? formatPrice(stats.cheapest.per_piece_cents) : "—"}
            sub={stats.cheapest?.name}
            href={stats.cheapest ? `/bars/${stats.cheapest.id}` : undefined}
          />
          <StatCard
            label="Most Expensive"
            value={stats.mostExpensive ? formatPrice(stats.mostExpensive.per_piece_cents) : "—"}
            sub={stats.mostExpensive?.name}
            href={stats.mostExpensive ? `/bars/${stats.mostExpensive.id}` : undefined}
          />
        </div>
      )}

      {stats && stats.barCount === 0 && (
        <p className="text-center text-gray-500 py-8">
          No bars tracked yet. Add some via the{" "}
          <Link href="/admin" className="text-orange-500 hover:underline">admin panel</Link>.
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-orange-400/40 hover:-translate-y-1 transition-all shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold text-orange-500">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5 truncate">{sub}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
