import clsx from "clsx";
import { TIME_RANGES, type TimeRange } from "@/lib/time-range";

// Full class strings, not built from the accent name, so Tailwind can see them.
const ACCENTS = {
  sky: "bg-sky-100 text-sky-800 border-sky-500/50 dark:bg-sky-400/10 dark:text-sky-400 dark:border-sky-400/30",
  rose: "bg-rose-100 text-rose-800 border-rose-500/50 dark:bg-rose-400/10 dark:text-rose-400 dark:border-rose-400/30",
} as const;

const INACTIVE =
  "bg-slate-200 text-slate-700 border-transparent hover:bg-slate-300 hover:text-slate-900 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-slate-200";

interface TimeRangeSwitchProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  accent: keyof typeof ACCENTS;
}

export default function TimeRangeSwitch({ value, onChange, accent }: TimeRangeSwitchProps) {
  return (
    <div className="flex gap-1.5">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={clsx(
            "h-9 px-3 rounded-lg border text-xs font-semibold transition-colors duration-150",
            value === range.value ? ACCENTS[accent] : INACTIVE
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
