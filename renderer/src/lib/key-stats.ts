import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import { useResults, type Result } from "@/lib/result-provider";
import { useProfileTimezone } from "@/lib/profile-timezone";
import { RANGE_DAYS, type TimeRange } from "@/lib/time-range";

export interface KeyStat {
  correct: number;
  incorrect: number;
}

// Subtract calendar days in the user's profile timezone. `{hours: days*24}`
// ignores DST, so on a "spring forward" Sunday a 7-day window would shave off
// an hour at the edge and risk dropping a session.
function instantDaysAgo(days: number, tz: string): Temporal.Instant {
  return Temporal.Now.zonedDateTimeISO(tz).subtract({ days }).toInstant();
}

/** Sessions on one layout inside [from, to). A null bound is open. */
function inWindow(
  results: Result[],
  keyboardName: KeyboardLayoutNames,
  from: Temporal.Instant | null,
  to: Temporal.Instant | null,
): Result[] {
  return results.filter((res) => {
    if (res.keyboard !== keyboardName) return false;
    const at = Temporal.Instant.from(res.datetime);
    if (from && Temporal.Instant.compare(at, from) < 0) return false;
    if (to && Temporal.Instant.compare(at, to) >= 0) return false;
    return true;
  });
}

/** Your sessions on one layout over the chosen range. */
export function useRangeResults(
  keyboardName: KeyboardLayoutNames,
  timeRange: TimeRange,
): Result[] {
  const { results } = useResults();
  const tz = useProfileTimezone();
  return useMemo(() => {
    const days = RANGE_DAYS[timeRange];
    return inWindow(results, keyboardName, days === null ? null : instantDaysAgo(days, tz), null);
  }, [results, keyboardName, timeRange, tz]);
}

/** The period of the same length just before the chosen range; null for all time. */
export function usePreviousRangeResults(
  keyboardName: KeyboardLayoutNames,
  timeRange: TimeRange,
): Result[] | null {
  const { results } = useResults();
  const tz = useProfileTimezone();
  return useMemo(() => {
    const days = RANGE_DAYS[timeRange];
    if (days === null) return null;
    return inWindow(results, keyboardName, instantDaysAgo(days * 2, tz), instantDaysAgo(days, tz));
  }, [results, keyboardName, timeRange, tz]);
}

/** Correct and missed presses per key, for one layout over a time range. */
export function useKeyStats(
  keyboardName: KeyboardLayoutNames,
  timeRange: TimeRange,
): Map<string, KeyStat> {
  const results = useRangeResults(keyboardName, timeRange);
  return useMemo(
    () =>
      results.reduce((acc, result) => {
        result.keyPresses?.forEach((keyPress) => {
          if (!acc.has(keyPress.key)) acc.set(keyPress.key, { correct: 0, incorrect: 0 });
          const k = acc.get(keyPress.key)!;
          keyPress.correct ? (k.correct += 1) : (k.incorrect += 1);
        });
        return acc;
      }, new Map<string, KeyStat>()),
    [results],
  );
}

export const keyLabel = (key: string) =>
  key === " " ? "space" : key.length === 1 ? key.toUpperCase() : key;
