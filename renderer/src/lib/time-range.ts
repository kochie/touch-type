// The range switch shared by the Stats and Key Map pages. Add or change a
// range here and both pages, and the data behind them, follow.
export type TimeRange = "7d" | "30d" | "90d" | "all";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

/** Window length in days, or null for no limit. */
export const RANGE_DAYS: Record<TimeRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};
