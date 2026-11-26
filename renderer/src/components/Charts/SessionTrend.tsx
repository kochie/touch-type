"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { movingAverage } from "@/lib/typing-metrics";
import { ChartMessage } from "./KeyTimingBars";

const SMOOTHING_WINDOW = 5;

export interface TrendPoint {
  datetime: string;
  value: number;
}

interface Props {
  title: string;
  subtitle: string;
  /** Oldest first. */
  points: TrendPoint[];
  color: string;
  /** What the tooltip calls the raw value, e.g. "Accuracy". */
  valueLabel: string;
  unit: string;
  /** Shown in the header: the range average and how it moved. */
  headline: { value: string; change: string | null } | null;
  emptyText: string;
}

/** One dot per session, with a smoothed line through them. */
export default function SessionTrend({
  title,
  subtitle,
  points,
  color,
  valueLabel,
  unit,
  headline,
  emptyText,
}: Props) {
  const smoothed = movingAverage(
    points.map((p) => p.value),
    SMOOTHING_WINDOW,
  );
  const data = points.map((p, i) => ({
    i,
    datetime: p.datetime,
    value: Math.round(p.value * 10) / 10,
    trend: Math.round(smoothed[i] * 10) / 10,
  }));

  return (
    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
        </div>
        {headline && (
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {headline.value}
            </p>
            {headline.change && <p className="text-xs text-slate-500">{headline.change}</p>}
          </div>
        )}
      </div>

      {data.length < 2 ? (
        <ChartMessage text={emptyText} />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="i" hide />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                width={48}
                unit={unit}
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin - 2)),
                  (dataMax: number) => Math.min(100, Math.ceil(dataMax + 1)),
                ]}
              />
              <Tooltip
                cursor={{ stroke: "rgba(148,163,184,0.4)" }}
                content={({ active, payload }) => {
                  const row = active && payload?.[0]?.payload;
                  if (!row) return null;
                  return (
                    <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 shadow-lg">
                      <p className="font-bold text-slate-100 mb-1">
                        {new Date(row.datetime).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p>
                        {valueLabel}: <span className="font-semibold">{row.value}{unit}</span>
                      </p>
                      <p>
                        Trend: <span className="font-semibold">{row.trend}{unit}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                dataKey="value"
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={1}
                dot={{ r: 2, fill: color, fillOpacity: 0.5, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                dataKey="trend"
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                type="monotone"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
