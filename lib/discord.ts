const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function vsAverage(perPieceCents: number, avgCents: number): string {
  const diff = perPieceCents - avgCents;
  const pct = Math.round(Math.abs(diff) / avgCents * 100);
  if (pct < 3) return "right on the neighbourhood average";
  return diff < 0
    ? `${pct}% cheaper than the neighbourhood average 🟢`
    : `${pct}% more expensive than the neighbourhood average 🔴`;
}

export async function notifyBarApproved({
  name,
  address,
  neighbourhood,
  priceCents,
  quantity,
  neighbourhoodAvgCents,
  barId,
  siteUrl,
}: {
  name: string;
  address: string | null;
  neighbourhood: string | null;
  priceCents: number;
  quantity: number;
  neighbourhoodAvgCents: number | null;
  barId: string;
  siteUrl: string;
}) {
  if (!WEBHOOK_URL) return;

  const perPieceCents = priceCents / quantity;
  const perPiece = (perPieceCents / 100).toFixed(2);
  const total = (priceCents / 100).toFixed(2);
  const barUrl = `${siteUrl}/en/bars/${barId}`;
  const locationLine = [neighbourhood, address].filter(Boolean).join(" · ");

  const comparisonLine = neighbourhoodAvgCents
    ? vsAverage(perPieceCents, neighbourhoodAvgCents)
    : null;

  const lines = [
    `📍 ${locationLine || "amsterdam"}`,
    `💶 €${perPiece}/pc  ·  €${total} for ${quantity}`,
    ...(comparisonLine ? [`\n📊 ${comparisonLine}`] : []),
  ];

  const payload = {
    embeds: [
      {
        title: `🧆 new bar added: ${name}`,
        url: barUrl,
        color: 0xfb923c,
        description: lines.join("\n"),
      },
    ],
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-fatal — don't let a Discord blip break the approval flow
  }
}
