"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getKeyTiming } from "@/transactions/statsCharts";
import { useStatsQuery } from "./useStatsQuery";

interface Props {
  days: number | null;
  keyboard: string;
}

// Same blue -> red scale as the key heatmap.
export function colorFor(t: number) {
  const r = Math.round(59 + t * (239 - 59));
  const g = Math.round(130 + t * (68 - 130));
  const b = Math.round(246 + t * (68 - 246));
  return `rgb(${r},${g},${b})`;
}

export default function KeyTimingBars({ days, keyboard }: Props) {
  const state = useStatsQuery(() => getKeyTiming(days, keyboard), [days, keyboard]);

  return (
    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-5">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Slowest letters
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Average time to reach each letter, slowest first
      </p>

      {state.status === "loading" && <ChartMessage text="Loading…" />}
      {state.status === "error" && <ChartMessage text={state.message} />}
      {state.status === "ready" && state.data.length === 0 && (
        <ChartMessage text="No typing data for this layout in this period yet." />
      )}
      {state.status === "ready" && state.data.length > 0 && (
        <KeyTimingChart rows={state.data} />
      )}
    </section>
  );
}

function KeyTimingChart({
  rows,
}: {
  rows: { key: string; avg_ms: number; error_rate: number; presses: number }[];
}) {
  const sorted = [...rows].sort((a, b) => b.avg_ms - a.avg_ms);
  const max = sorted[0].avg_ms;
  const min = sorted[sorted.length - 1].avg_ms;
  const range = max - min || 1;
  const data = sorted.map((r) => ({ ...r, label: r.key.toUpperCase() }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
          <XAxis dataKey="label" tickLine={false} stroke="#94a3b8" fontSize={12} />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            unit="ms"
            width={56}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
            content={({ active, payload }) => {
              const row = active && payload?.[0]?.payload;
              if (!row) return null;
              return (
                <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 shadow-lg">
                  <p className="font-bold text-slate-100 mb-1">{row.label}</p>
                  <p>Avg time: <span className="font-semibold">{row.avg_ms}ms</span></p>
                  <p>Error rate: <span className="font-semibold">{(row.error_rate * 100).toFixed(1)}%</span></p>
                  <p>Presses: <span className="font-semibold">{row.presses.toLocaleString()}</span></p>
                </div>
              );
            }}
          />
          <Bar dataKey="avg_ms" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.key} fill={colorFor((d.avg_ms - min) / range)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartMessage({ text }: { text: string }) {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-fg-subtle">
      {text}
    </div>
  );
}
