// Single source of truth for duration handling across the renderer.
//
// The `results.time` column historically held a raw millisecond count stored as
// text (AWS-era data: "21819"). New writes use ISO 8601 (`Temporal.Duration.toString()`
// → "PT21.819S"). Other surfaces (leaderboard, PvP) store integer milliseconds
// directly. parseDuration accepts all three forms so callers don't have to know
// which surface they're reading from.

const ZERO = Temporal.Duration.from({ milliseconds: 0 });

export const ZERO_DURATION: Temporal.Duration = ZERO;

/**
 * Parse a duration from an untrusted value.
 *
 * Accepts:
 *   - `Temporal.Duration` — returned unchanged
 *   - `number` — treated as milliseconds
 *   - ISO 8601 string (`"PT21.819S"`) — parsed directly
 *   - Numeric string (`"21819"`) — treated as milliseconds (legacy data)
 *   - `null`, `undefined`, or anything else — returns `ZERO_DURATION`
 *
 * Never throws. On unparseable input emits a console warning so the bad value
 * is visible in Sentry breadcrumbs.
 */
export function parseDuration(value: unknown): Temporal.Duration {
  if (value == null) return ZERO;
  if (value instanceof Temporal.Duration) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return ZERO;
    return Temporal.Duration.from({ milliseconds: value });
  }
  if (typeof value === "string") {
    if (value.length === 0) return ZERO;
    if (value[0] === "P" || value[0] === "-") {
      try {
        return Temporal.Duration.from(value);
      } catch {
        // fall through to numeric-string handling
      }
    }
    const n = Number(value);
    if (Number.isFinite(n)) return Temporal.Duration.from({ milliseconds: n });
    console.warn(`parseDuration: unparseable string ${JSON.stringify(value)}`);
    return ZERO;
  }
  console.warn(`parseDuration: unsupported type ${typeof value}`);
  return ZERO;
}

/** Total milliseconds of a duration value (safe). */
export function durationToMs(value: unknown): number {
  return parseDuration(value).total("milliseconds");
}

/** Total seconds (fractional) of a duration value (safe). */
export function durationToSeconds(value: unknown): number {
  return parseDuration(value).total("milliseconds") / 1000;
}

/** Total minutes (fractional) of a duration value (safe). */
export function durationToMinutes(value: unknown): number {
  return parseDuration(value).total("milliseconds") / 60000;
}

/** Construct a `Temporal.Duration` from a millisecond count. */
export function msToDuration(ms: number): Temporal.Duration {
  return Temporal.Duration.from({ milliseconds: ms });
}

/**
 * Format a duration value as a display string.
 *
 * Formats:
 *   - "mm:ss"      → "01:23"
 *   - "m:ss"       → "1:23"
 *   - "s.S"        → "23.4" (seconds with one-decimal tenths)
 *   - "m:ss.SSS"   → "1:23.456"
 */
export function formatDuration(
  d: Temporal.Duration | number | string,
  format: "mm:ss" | "m:ss" | "s.S" | "m:ss.SSS",
): string {
  const totalMs = durationToMs(d);
  const mins = Math.floor(totalMs / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1_000);
  const ms = Math.floor(totalMs % 1_000);

  switch (format) {
    case "mm:ss":
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    case "m:ss":
      return `${mins}:${String(secs).padStart(2, "0")}`;
    case "s.S":
      return `${secs}.${Math.floor(ms / 100)}`;
    case "m:ss.SSS":
      return `${mins}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }
}
