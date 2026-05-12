// renderer/src/lib/relative-time.ts

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Returns a human-readable relative time string (e.g. "2 hours ago").
 * Accepts an ISO 8601 timestamp string.
 */
export function formatDistanceToNow(isoString: string): string {
  const then = Temporal.Instant.from(isoString);
  const diffMs = Temporal.Now.instant().since(then).total("milliseconds");

  const seconds = Math.floor(diffMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return rtf.format(-days, "day");
  if (hours > 0) return rtf.format(-hours, "hour");
  if (minutes > 0) return rtf.format(-minutes, "minute");
  return rtf.format(-seconds, "second");
}
