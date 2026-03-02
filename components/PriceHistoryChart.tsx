"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Price {
  id: string;
  price_cents: number;
  quantity: number;
  recorded_at: string;
  notes: string | null;
}

interface Props {
  prices: Price[];
}

export default function PriceHistoryChart({ prices }: Props) {
  const data = prices.map((p) => ({
    date: new Date(p.recorded_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    price: p.price_cents / p.quantity / 100,
    fullDate: new Date(p.recorded_at).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  }));

  return (
    <div className="bg-[#10161d] rounded-xl border border-[#151e26] p-4">
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#151e26" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `€${v.toFixed(2)}`}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value: number | undefined) => [value != null ? `€${value.toFixed(2)}/pc` : "—", "Per piece"]}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: "#10161d",
              borderColor: "#151e26",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#ffffff",
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#fb923c"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#fb923c", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
