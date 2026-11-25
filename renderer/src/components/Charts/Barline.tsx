"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useResults } from "@/lib/result-provider";
import { Levels } from "@/lib/settings_hook";
import { colorForLevel } from "@/lib/level-colors";
import { ChartMessage } from "./KeyTimingBars";

const MAX_SESSIONS = 75;
// Height of the typo area below the line, as a fraction of the speed range.
const TYPO_SHARE = 0.35;

const TYPO_COLOR = "#c98585";
const PILL_LEVELS = [Levels.LEVEL_1, Levels.LEVEL_2, Levels.LEVEL_3, Levels.LEVEL_4, Levels.LEVEL_5, Levels.LEVEL_6];
const PILL_LEVELS_WITH_0 = [Levels.LEVEL_0, ...PILL_LEVELS];

interface BarlineProps {
  keyboard: string;
}

export default function Barline({ keyboard }: BarlineProps) {
  const { results } = useResults();

  const allData = useMemo(() => {
    const rows = results
      .filter((r) => r.keyboard === keyboard)
      .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))
      .slice(-MAX_SESSIONS);

    // Typos live on their own scale: the worst session fills the area below
    // the line, whatever its absolute count. Real counts stay in `incorrect`.
    const maxCpm = Math.max(1, ...rows.map((r) => r.cpm));
    const maxTypos = Math.max(1, ...rows.map((r) => r.incorrect));
    const typoRoom = maxCpm * TYPO_SHARE;

    return rows.map((r, i) => ({
      i,
      cpm: Math.round(r.cpm),
      typos: -(r.incorrect / maxTypos) * typoRoom,
      incorrect: r.incorrect,
      level: r.level,
      datetime: r.datetime,
    }));
  }, [results, keyboard]);

  const [hiddenLevels, setHiddenLevels] = useState<ReadonlySet<Levels>>(new Set());
  const [showTypos, setShowTypos] = useState(true);

  const toggleLevel = (level: Levels) =>
    setHiddenLevels((prev) => {
      const next = new Set(prev);
      if (!next.delete(level)) next.add(level);
      return next;
    });

  const sessionsPerLevel = useMemo(() => {
    const counts = new Map<Levels, number>();
    for (const d of allData) counts.set(d.level, (counts.get(d.level) ?? 0) + 1);
    return counts;
  }, [allData]);

  // Level 0 is only worth a pill if the user actually has such sessions.
  const pillLevels = useMemo(
    () => (sessionsPerLevel.has(Levels.LEVEL_0) ? PILL_LEVELS_WITH_0 : PILL_LEVELS),
    [sessionsPerLevel],
  );

  // Hidden levels are removed, not blanked, so the remaining bars close up.
  const data = useMemo(
    () =>
      allData
        .filter((d) => !hiddenLevels.has(d.level))
        .map((d, i) => ({ ...d, i })),
    [allData, hiddenLevels],
  );

  return (
    <section className="rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] p-5">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Recent sessions
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Speed (CPM) above the line, typos below on their own scale, for your last {MAX_SESSIONS} sessions
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filter sessions by level">
        {pillLevels.map((level) => (
          <Pill
            key={level}
            label={`Level ${level}`}
            color={colorForLevel(level)}
            active={!hiddenLevels.has(level)}
            dim={!sessionsPerLevel.has(level)}
            onClick={() => toggleLevel(level)}
          />
        ))}
        <Pill
          label="Typos"
          color={TYPO_COLOR}
          active={showTypos}
          onClick={() => setShowTypos((v) => !v)}
        />
      </div>

      {data.length === 0 ? (
        <ChartMessage
          text={
            allData.length === 0
              ? "No sessions on this keyboard layout yet."
              : "Every level is hidden. Turn one back on above."
          }
        />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              stackOffset="sign"
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              barCategoryGap={1}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="i" hide />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                width={40}
                allowDecimals={false}
                tickFormatter={(v: number) => (v < 0 ? "" : String(v))}
              />
              <ReferenceLine y={0} stroke="rgba(148,163,184,0.5)" />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.12)" }}
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
                        {row.level ? ` · Level ${row.level}` : ""}
                      </p>
                      <p>Speed: <span className="font-semibold">{row.cpm} CPM</span></p>
                      <p>Typos: <span className="font-semibold">{row.incorrect}</span></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="cpm" stackId="s" radius={[3, 3, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.i} fill={colorForLevel(d.level)} />
                ))}
              </Bar>
              {showTypos && (
                <Bar dataKey="typos" stackId="s" fill={TYPO_COLOR} radius={[3, 3, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function Pill({
  label,
  color,
  active,
  dim,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  /** Nothing to show for this pill (e.g. no sessions at that level). */
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={active ? { borderColor: `${color}80`, backgroundColor: `${color}26` } : undefined}
      className={clsx(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
        active
          ? "text-slate-700 dark:text-slate-200"
          : "border-transparent bg-slate-200/60 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300",
        dim && "opacity-50",
      )}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: active ? color : "#64748b" }}
      />
      {label}
    </button>
  );
}
