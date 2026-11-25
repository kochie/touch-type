"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getSpeedDistribution,
  type SpeedDistribution as Distribution,
} from "@/transactions/statsCharts";
import { useStatsQuery } from "./useStatsQuery";
import { ChartMessage } from "./KeyTimingBars";

interface Props {
  days: number | null;
}

const BUCKET = 5;
const CAP = 100; // everything at or above this is shown as one "100+" bar

function labelFor(from: number) {
  return from >= CAP ? `${CAP}+` : `${from}`;
}

/** Fill gaps with zero-height buckets and fold the long tail into one bar. */
function toBars(d: NonNullable<Distribution["population"]>) {
  const counts = new Map<number, number>();
  for (const b of d.buckets) {
    const from = Math.min(b.from, CAP);
    counts.set(from, (counts.get(from) ?? 0) + b.users);
  }
  const bars: { from: number; label: string; users: number }[] = [];
  for (let from = 0; from <= CAP; from += BUCKET) {
    bars.push({ from, label: labelFor(from), users: counts.get(from) ?? 0 });
  }
  return bars;
}

const bucketOf = (wpm: number) => Math.min(Math.floor(wpm / BUCKET) * BUCKET, CAP);

export default function SpeedDistribution({ days }: Props) {
  const state = useStatsQuery(() => getSpeedDistribution(days), [days]);

  return (
    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-5">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        How your speed compares
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Everyone&apos;s average speed (WPM), with you marked
      </p>

      {state.status === "loading" && <ChartMessage text="Loading…" />}
      {state.status === "error" && <ChartMessage text={state.message} />}
      {state.status === "ready" && <Body data={state.data} />}
    </section>
  );
}

function Body({ data }: { data: Distribution }) {
  if (!data.you) {
    return <ChartMessage text="Complete a few sessions in this period to see where you stand." />;
  }
  if (!data.population) {
    return (
      <ChartMessage text="Not enough other typists in this period to compare against yet. Try a longer range." />
    );
  }

  const { you, population } = data;
  const bars = toBars(population);
  const lowSigma = Math.max(0, population.mean_wpm - population.std_wpm);
  const highSigma = population.mean_wpm + population.std_wpm;
  const youBar = labelFor(bucketOf(you.avg_wpm));
  const meanBar = labelFor(bucketOf(population.mean_wpm));

  return (
    <>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 text-xs text-slate-500">
        <span>
          You: <b className="text-slate-800 dark:text-slate-100">{you.avg_wpm} WPM</b>
        </span>
        <span>
          Average: <b className="text-slate-800 dark:text-slate-100">{population.mean_wpm} WPM</b>
        </span>
        <span>
          Typical range (±1 SD):{" "}
          <b className="text-slate-800 dark:text-slate-100">
            {Math.round(lowSigma)}–{Math.round(highSigma)} WPM
          </b>
        </span>
        {you.percentile !== null && (
          <span>
            Faster than{" "}
            <b className="text-slate-800 dark:text-slate-100">{Math.round(you.percentile)}%</b>{" "}
            of {population.users} typists
          </span>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
            <ReferenceArea
              x1={labelFor(bucketOf(lowSigma))}
              x2={labelFor(bucketOf(highSigma))}
              fill="rgba(56,189,248,0.10)"
              ifOverflow="extendDomain"
            />
            <XAxis dataKey="label" tickLine={false} stroke="#94a3b8" fontSize={12} interval={1} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} width={32} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              content={({ active, payload }) => {
                const row = active && payload?.[0]?.payload;
                if (!row) return null;
                const range = row.from >= CAP ? `${CAP}+ WPM` : `${row.from}–${row.from + BUCKET} WPM`;
                return (
                  <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 shadow-lg">
                    <p className="font-bold text-slate-100 mb-1">{range}</p>
                    <p><span className="font-semibold">{row.users}</span> typists</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={meanBar} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "avg", position: "top", fill: "#94a3b8", fontSize: 11 }} />
            <ReferenceLine x={youBar} stroke="#38bdf8" strokeWidth={2} label={{ value: "you", position: "top", fill: "#38bdf8", fontSize: 11 }} />
            <Bar dataKey="users" radius={[3, 3, 0, 0]}>
              {bars.map((b) => (
                <Cell key={b.from} fill={labelFor(b.from) === youBar ? "#38bdf8" : "#64748b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
