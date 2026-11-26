"use client";

import { useMemo } from "react";
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
import type { KeyboardLayoutNames } from "@/keyboards";
import { useRangeResults } from "@/lib/key-stats";
import type { TimeRange } from "@/lib/time-range";
import { bigramStats } from "@/lib/typing-metrics";
import { ChartMessage, colorFor } from "./KeyTimingBars";

const TOP = 15;

interface Props {
  keyboard: KeyboardLayoutNames;
  timeRange: TimeRange;
}

export default function BigramTroubleSpots({ keyboard, timeRange }: Props) {
  const results = useRangeResults(keyboard, timeRange);
  const rows = useMemo(() => bigramStats(results).slice(0, TOP), [results]);

  const max = rows[0]?.avgMs ?? 0;
  const min = rows[rows.length - 1]?.avgMs ?? 0;
  const range = max - min || 1;
  const data = rows.map((r) => ({ ...r, label: r.pair.toUpperCase() }));

  return (
    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-5">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Trickiest letter pairs
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Average time to get from one letter to the next, slowest first. Pairs you've typed fewer than 8 times are left out.
      </p>

      {data.length === 0 ? (
        <ChartMessage text="Not enough timed typing on this layout in this period yet." />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="label" tickLine={false} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} unit="ms" width={56} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
                content={({ active, payload }) => {
                  const row = active && payload?.[0]?.payload;
                  if (!row) return null;
                  return (
                    <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 shadow-lg">
                      <p className="font-bold text-slate-100 mb-1">{row.label}</p>
                      <p>Avg time: <span className="font-semibold">{row.avgMs}ms</span></p>
                      <p>Missed first: <span className="font-semibold">{(row.errorRate * 100).toFixed(1)}%</span></p>
                      <p>Times typed: <span className="font-semibold">{row.presses.toLocaleString()}</span></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avgMs" radius={[4, 4, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.pair} fill={colorFor((d.avgMs - min) / range)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
