"use client";

import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
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
const CAP = 100; // buckets at or above this are folded into one cluster just past 100
const MAX_X = CAP + BUCKET * 2;
const STEP = 1; // curve resolution in WPM
const BANDWIDTH = 8; // Gaussian width in WPM: larger = smoother

/**
 * Kernel density estimate. Each histogram bucket is a cluster of users at its
 * midpoint; the curve is the sum of Gaussians centred on them, sampled every
 * STEP wpm. Exact counts are deliberately not shown: the cohort is small, so
 * the shape matters more than the numbers.
 */
function toCurve(d: NonNullable<Distribution["population"]>) {
  const clusters = new Map<number, number>();
  for (const b of d.buckets) {
    const from = Math.min(b.from, CAP);
    clusters.set(from, (clusters.get(from) ?? 0) + b.users);
  }
  const points: { at: number; users: number }[] = [];
  for (const [from, users] of clusters) {
    const at = from + BUCKET / 2;
    points.push({ at, users });
    points.push({ at: -at, users }); // mirror so the curve isn't cut off at 0
  }

  const curve: { wpm: number; density: number }[] = [];
  for (let wpm = 0; wpm <= MAX_X; wpm += STEP) {
    let density = 0;
    for (const p of points) {
      const z = (wpm - p.at) / BANDWIDTH;
      density += p.users * Math.exp(-0.5 * z * z);
    }
    curve.push({ wpm, density });
  }
  return curve;
}

const clampX = (wpm: number) => Math.min(Math.max(wpm, 0), MAX_X);

export default function SpeedDistribution({ days }: Props) {
  const state = useStatsQuery(() => getSpeedDistribution(days), [days]);

  return (
    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-5">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        How your speed compares
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        How typing speeds (WPM) are spread out, with you marked
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
  const curve = toCurve(population);
  const lowSigma = Math.max(0, population.mean_wpm - population.std_wpm);
  const highSigma = population.mean_wpm + population.std_wpm;
  const youX = clampX(you.avg_wpm);
  const meanX = clampX(population.mean_wpm);

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
            of typists
          </span>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curve} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="speed-curve" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <ReferenceArea
              x1={clampX(lowSigma)}
              x2={clampX(highSigma)}
              fill="rgba(148,163,184,0.12)"
              ifOverflow="extendDomain"
            />
            <XAxis
              dataKey="wpm"
              type="number"
              domain={[0, MAX_X]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tickLine={false}
              stroke="#94a3b8"
              fontSize={12}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Area
              type="monotone"
              dataKey="density"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#speed-curve)"
              isAnimationActive={false}
            />
            <ReferenceLine
              x={meanX}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: "avg", position: "top", fill: "#94a3b8", fontSize: 11 }}
            />
            <ReferenceLine
              x={youX}
              stroke="var(--fg)"
              strokeWidth={2}
              label={{ value: "you", position: "top", fill: "var(--fg)", fontSize: 11 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
