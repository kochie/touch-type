import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import type { Result } from "@/lib/result-provider";
import { usePreviousRangeResults, useRangeResults } from "@/lib/key-stats";
import { RANGE_DAYS, type TimeRange } from "@/lib/time-range";

// Same rules as the stats_key_timing database function: the time to reach a
// letter is the gap from the previous keypress in the same session, and gaps of
// 5s or more are pauses rather than typing.
const MAX_GAP_MS = 5000;
const MIN_SAMPLES = 3;

export interface KeyTiming {
  key: string;
  /** Timed presses behind the averages. */
  samples: number;
  avgMs: number;
  /** Standard deviation of the gaps. */
  stdMs: number;
  /** stdMs / avgMs: how erratic the key is relative to how slow it is. */
  variation: number;
  missRate: number;
}

export function computeKeyTimings(results: Result[]): Map<string, KeyTiming> {
  const acc = new Map<string, { gaps: number[]; misses: number; presses: number }>();

  for (const result of results) {
    const presses = result.keyPresses ?? [];
    for (let i = 1; i < presses.length; i++) {
      const cur = presses[i];
      const prev = presses[i - 1];
      if (cur.timestamp === undefined || prev.timestamp === undefined) continue;
      const key = cur.key.toLowerCase();
      if (!/^\p{L}$/u.test(key)) continue;

      let entry = acc.get(key);
      if (!entry) {
        entry = { gaps: [], misses: 0, presses: 0 };
        acc.set(key, entry);
      }
      entry.presses += 1;
      if (!cur.correct) entry.misses += 1;
      const gap = cur.timestamp - prev.timestamp;
      if (gap > 0 && gap < MAX_GAP_MS) entry.gaps.push(gap);
    }
  }

  const out = new Map<string, KeyTiming>();
  acc.forEach((entry, key) => {
    const n = entry.gaps.length;
    if (n < MIN_SAMPLES) return;
    const avg = entry.gaps.reduce((a, b) => a + b, 0) / n;
    const variance = entry.gaps.reduce((a, g) => a + (g - avg) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    out.set(key, {
      key,
      samples: n,
      avgMs: avg,
      stdMs: std,
      variation: std / avg,
      missRate: entry.misses / entry.presses,
    });
  });
  return out;
}

/** Per-key timing over the chosen range. */
export function useKeyTimings(
  keyboardName: KeyboardLayoutNames,
  timeRange: TimeRange,
): Map<string, KeyTiming> {
  const results = useRangeResults(keyboardName, timeRange);
  return useMemo(() => computeKeyTimings(results), [results]);
}

export interface KeyChange {
  key: string;
  current: KeyTiming;
  previous: KeyTiming;
  /** (current - previous) / previous average time. Negative is faster. */
  change: number;
}

/** Each key's timing now against the period of the same length just before. */
export function useKeyImprovement(
  keyboardName: KeyboardLayoutNames,
  timeRange: TimeRange,
): { supported: boolean; days: number | null; changes: Map<string, KeyChange> } {
  const current = useRangeResults(keyboardName, timeRange);
  const previous = usePreviousRangeResults(keyboardName, timeRange);

  return useMemo(() => {
    const days = RANGE_DAYS[timeRange];
    const changes = new Map<string, KeyChange>();
    if (previous === null) return { supported: false, days, changes };

    const now = computeKeyTimings(current);
    const before = computeKeyTimings(previous);
    now.forEach((cur, key) => {
      const prev = before.get(key);
      if (!prev) return;
      changes.set(key, { key, current: cur, previous: prev, change: (cur.avgMs - prev.avgMs) / prev.avgMs });
    });
    return { supported: true, days, changes };
  }, [current, previous, timeRange]);
}
