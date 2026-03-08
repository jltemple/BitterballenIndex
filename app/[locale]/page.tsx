export const revalidate = false; // cache indefinitely, invalidate via revalidatePath()

import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const HOME_META = {
  en: {
    title: "Bitterballen Index Amsterdam",
    description:
      "Tracking the price of bitterballen at bars across Amsterdam — find the best deal in the city.",
  },
  nl: {
    title: "Bitterballen Index Amsterdam",
    description:
      "De prijs van bitterballen bijhouden in cafés in heel Amsterdam — vind altijd de beste deal.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = HOME_META[locale as keyof typeof HOME_META] ?? HOME_META.en;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: {
        en: `${SITE_URL}/en`,
        nl: `${SITE_URL}/nl`,
        "x-default": `${SITE_URL}/en`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${SITE_URL}/${locale}`,
      locale: locale === "nl" ? "nl_NL" : "en_US",
      alternateLocale: locale === "nl" ? ["en_US"] : ["nl_NL"],
    },
    twitter: {
      title: meta.title,
      description: meta.description,
    },
  };
}
import { supabase } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";

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
    price_cents: p.price_cents,
    quantity: p.quantity,
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
    cheapest: cheapestBar
      ? { name: cheapestBar.name, id: cheapestBar.id, per_piece_cents: sorted[0].per_piece_cents, price_cents: sorted[0].price_cents, quantity: sorted[0].quantity }
      : null,
    mostExpensive: expensiveBar
      ? { name: expensiveBar.name, id: expensiveBar.id, per_piece_cents: sorted[sorted.length - 1].per_piece_cents, price_cents: sorted[sorted.length - 1].price_cents, quantity: sorted[sorted.length - 1].quantity }
      : null,
  };
}

function formatPerPiece(cents: number) {
  return `€${(cents / 100).toFixed(2)}/pc`;
}

function formatTotal(price_cents: number, quantity: number) {
  return `€${(price_cents / 100).toFixed(2)} for ${quantity}`;
}

export default async function HomePage() {
  const stats = await getStats();
  const t = await getTranslations("home");

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center py-14">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
          {t("badge")}
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
          {t("title")}
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/bars"
            prefetch={false}
            className="bg-orange-500 text-white px-6 py-2.5 rounded-full font-semibold shadow-sm hover:bg-orange-600 hover:-translate-y-px active:scale-95 transition-all"
          >
            {t("browseBars")}
          </Link>
          <Link
            href="/map"
            prefetch={false}
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full font-semibold hover:border-orange-500 hover:bg-orange-50 transition-all"
          >
            {t("viewMap")}
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label={t("barsTracked")} value={stats.barCount.toString()} />
          <StatCard
            label={t("cityAverage")}
            value={stats.cityAvg ? formatPerPiece(stats.cityAvg) : "—"}
            subValue={stats.cityAvg ? `≈${formatTotal(Math.round(stats.cityAvg * 6), 6)}` : undefined}
          />
          <StatCard
            label={t("cheapest")}
            value={stats.cheapest ? formatPerPiece(stats.cheapest.per_piece_cents) : "—"}
            subValue={stats.cheapest ? formatTotal(stats.cheapest.price_cents, stats.cheapest.quantity) : undefined}
            sub={stats.cheapest?.name}
            href={stats.cheapest ? `/bars/${stats.cheapest.id}` : undefined}
          />
          <StatCard
            label={t("mostExpensive")}
            value={stats.mostExpensive ? formatPerPiece(stats.mostExpensive.per_piece_cents) : "—"}
            subValue={stats.mostExpensive ? formatTotal(stats.mostExpensive.price_cents, stats.mostExpensive.quantity) : undefined}
            sub={stats.mostExpensive?.name}
            href={stats.mostExpensive ? `/bars/${stats.mostExpensive.id}` : undefined}
          />
        </div>
      )}

      {stats && stats.barCount === 0 && (
        <p className="text-center text-gray-500 py-8">
          {t.rich("noBarsYet", {
            link: (chunks) => (
              <a href="/admin" className="text-orange-500 hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  sub,
  href,
}: {
  label: string;
  value: string;
  subValue?: string;
  sub?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:border-orange-400/40 hover:-translate-y-1 transition-all shadow-sm">
      <p className="text-xs font-semibold text-gray-500 tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-orange-500">{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
      {sub && <p className="text-xs text-gray-400 mt-1.5 truncate">{sub}</p>}
    </div>
  );

  if (href) return <Link href={href} prefetch={false}>{content}</Link>;
  return content;
}
