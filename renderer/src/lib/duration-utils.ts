// renderer/src/lib/duration-utils.ts

/**
 * Format a Temporal.Duration into display strings.
 * Supported formats match the Luxon patterns used in this codebase.
 */
export function formatDuration(
  d: Temporal.Duration,
  format: "mm:ss" | "m:ss" | "s.S" | "m:ss.SSS"
): string {
  const totalMs = d.total("milliseconds");
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
