"use client";

import { useMemo } from "react";
import type { KeyboardLayoutNames } from "@/keyboards";
import { usePreviousRangeResults, useRangeResults } from "@/lib/key-stats";
import type { TimeRange } from "@/lib/time-range";
import { mean, rhythmOf } from "@/lib/typing-metrics";
import SessionTrend, { type TrendPoint } from "./SessionTrend";

const MAX_SESSIONS = 150;

interface Props {
  keyboard: KeyboardLayoutNames;
  timeRange: TimeRange;
}

export default function RhythmConsistency({ keyboard, timeRange }: Props) {
  const current = useRangeResults(keyboard, timeRange);
  const previous = usePreviousRangeResults(keyboard, timeRange);

  const { points, headline } = useMemo(() => {
    const toPoints = (rows: typeof current): TrendPoint[] =>
      [...rows]
        .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))
        .flatMap((r) => {
          const rhythm = rhythmOf(r);
          return rhythm ? [{ datetime: r.datetime, value: rhythm.steadiness }] : [];
        });

    const all = toPoints(current);
    const average = mean(all.map((p) => p.value));
    const previousAverage = previous ? mean(toPoints(previous).map((p) => p.value)) : null;

    let change: string | null = null;
    if (average !== null && previousAverage !== null) {
      const delta = average - previousAverage;
      change = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs previous period`;
    }

    return {
      points: all.slice(-MAX_SESSIONS),
      headline: average === null ? null : { value: `${Math.round(average)} / 100`, change },
    };
  }, [current, previous]);

  return (
    <SessionTrend
      title="Rhythm"
      subtitle="How even your keystroke tempo is. Hesitations and stumbles pull it down, a smooth flow pushes it up."
      points={points}
      color="#a78bfa"
      valueLabel="Steadiness"
      unit=""
      headline={headline}
      emptyText="Not enough timed sessions on this layout in this period yet."
    />
  );
}
