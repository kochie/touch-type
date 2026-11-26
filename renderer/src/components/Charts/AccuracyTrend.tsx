"use client";

import { useMemo } from "react";
import type { KeyboardLayoutNames } from "@/keyboards";
import { usePreviousRangeResults, useRangeResults } from "@/lib/key-stats";
import type { TimeRange } from "@/lib/time-range";
import { accuracyOf, mean } from "@/lib/typing-metrics";
import SessionTrend, { type TrendPoint } from "./SessionTrend";

const MAX_SESSIONS = 150;

interface Props {
  keyboard: KeyboardLayoutNames;
  timeRange: TimeRange;
}

export default function AccuracyTrend({ keyboard, timeRange }: Props) {
  const current = useRangeResults(keyboard, timeRange);
  const previous = usePreviousRangeResults(keyboard, timeRange);

  const { points, headline } = useMemo(() => {
    const toPoints = (rows: typeof current): TrendPoint[] =>
      [...rows]
        .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))
        .flatMap((r) => {
          const value = accuracyOf(r);
          return value === null ? [] : [{ datetime: r.datetime, value }];
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
      headline: average === null ? null : { value: `${average.toFixed(1)}%`, change },
    };
  }, [current, previous]);

  return (
    <SessionTrend
      title="Accuracy"
      subtitle="Share of keystrokes you got right, per session, with a 5-session trend"
      points={points}
      color="#38bdf8"
      valueLabel="Accuracy"
      unit="%"
      headline={headline}
      emptyText="Not enough sessions on this layout in this period yet."
    />
  );
}
