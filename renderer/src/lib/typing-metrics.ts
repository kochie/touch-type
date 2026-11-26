import type { Result } from "@/lib/result-provider";

/** A gap longer than this is a pause (reading, a distraction), not typing rhythm. */
export const PAUSE_MS = 2000;

/** Fewest gaps a session needs before its rhythm score means anything. */
const MIN_GAPS_FOR_RHYTHM = 20;

/** Accuracy of one session as a percentage, or null when nothing was typed. */
export function accuracyOf(result: Pick<Result, "correct" | "incorrect">): number | null {
  const total = result.correct + result.incorrect;
  return total > 0 ? (result.correct / total) * 100 : null;
}

/**
 * Milliseconds between consecutive correct presses in one session, with each
 * gap flagged if a miss happened on the way. Pauses and sessions recorded
 * before timestamps existed yield nothing.
 */
function correctPressGaps(result: Result): { from: string; to: string; ms: number; missed: boolean }[] {
  const gaps: { from: string; to: string; ms: number; missed: boolean }[] = [];
  let prev: { key: string; at: number } | null = null;
  let missed = false;

  for (const press of result.keyPresses ?? []) {
    if (press.timestamp === undefined) continue;
    if (!press.correct) {
      missed = true;
      continue;
    }
    if (prev) {
      const ms = press.timestamp - prev.at;
      if (ms > 0 && ms < PAUSE_MS) {
        gaps.push({ from: prev.key, to: press.key, ms, missed });
      }
    }
    prev = { key: press.key, at: press.timestamp };
    missed = false;
  }
  return gaps;
}

export interface BigramStat {
  /** Two lowercase letters, e.g. "th". */
  pair: string;
  avgMs: number;
  presses: number;
  /** Share of this pair's occurrences where the second letter was missed first. */
  errorRate: number;
}

/** Slowest letter pairs across the given sessions, slowest first. */
export function bigramStats(results: Result[], minPresses = 8): BigramStat[] {
  const totals = new Map<string, { ms: number; n: number; misses: number }>();

  for (const result of results) {
    for (const gap of correctPressGaps(result)) {
      if (gap.from.length !== 1 || gap.to.length !== 1) continue;
      if (gap.from === " " || gap.to === " ") continue;
      const pair = (gap.from + gap.to).toLowerCase();
      const t = totals.get(pair) ?? { ms: 0, n: 0, misses: 0 };
      t.ms += gap.ms;
      t.n += 1;
      if (gap.missed) t.misses += 1;
      totals.set(pair, t);
    }
  }

  return [...totals]
    .filter(([, t]) => t.n >= minPresses)
    .map(([pair, t]) => ({
      pair,
      avgMs: Math.round(t.ms / t.n),
      presses: t.n,
      errorRate: t.misses / t.n,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

export interface Rhythm {
  /** 0 to 100. Higher means more even keystroke timing. */
  steadiness: number;
  /** Typical gap between keystrokes. */
  medianMs: number;
}

/**
 * How even one session's tempo was. Uses the coefficient of variation of the
 * gaps (stddev / mean), which ignores raw speed, so a slow steady typist
 * scores the same as a fast steady one.
 */
export function rhythmOf(result: Result): Rhythm | null {
  const gaps = correctPressGaps(result).map((g) => g.ms);
  if (gaps.length < MIN_GAPS_FOR_RHYTHM) return null;

  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length;
  const cv = Math.sqrt(variance) / mean;

  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    steadiness: Math.round(Math.min(100, Math.max(0, (1 - cv) * 100))),
    medianMs: Math.round(median),
  };
}

export const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Trailing moving average, so each point averages itself and the `window - 1` before it. */
export function movingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
