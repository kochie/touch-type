import type { Result } from "@/lib/result-provider";
import { Duration } from "luxon";

export type ChartDataDays = 7 | 30;

export type ChartDataRange = 7 | 14 | 30 | 180 | "all";

/** Human-readable label for each range option */
export const CHART_RANGE_LABELS: Record<ChartDataRange, string> = {
  7: "7 days",
  14: "14 days",
  30: "1 month",
  180: "6 months",
  all: "All time",
};

type ChartSlot = { dateString: string; name: string; results: Result[] };

/**
 * Get chart data for a category. Call from a component that has already
 * called useResults() and pass the results array. Supports configurable
 * time window (days number or 'all' for all data). Longer ranges are
 * bucketed (weeks for 30 days, months for 180 / all) for readability.
 */
export function getChartData(
  category: string,
  results: Result[],
  days: number | "all" = 7
): { name: string; dateString: string; [key: string]: string | number }[] {
  const resultsByDate = results.reduce((acc, result) => {
    const date = new Date(result.datetime).toLocaleDateString();

    if (acc.has(date)) {
      const sameDate = acc.get(date)!;
      sameDate.push(result);
      const sorted = sameDate.sort(
        (a, b) =>
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
      acc.set(date, [...sorted]);
    } else {
      acc.set(date, [result]);
    }

    return acc;
  }, new Map<string, Result[]>());

  const intlFormatShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const intlFormatMonth = new Intl.DateTimeFormat("en-US", { month: "short" });
  const intlFormatMonthYear = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  });

  /** Build slots (day or bucket) with results for each. */
  const buildSlots = (): ChartSlot[] => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // 7 and 14 days: one slot per day
    if (days === 7 || days === 14) {
      const end = new Date(today);
      const start = new Date(today);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
      const slots: ChartSlot[] = [];
      const current = new Date(start);
      while (current <= end) {
        const dateString = current.toLocaleDateString();
        slots.push({
          dateString,
          name: intlFormatShort.format(current),
          results: resultsByDate.get(dateString) ?? [],
        });
        current.setDate(current.getDate() + 1);
      }
      return slots;
    }

    // 30 days: bucket by week (4 buckets)
    if (days === 30) {
      const end = new Date(today);
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      const slots: ChartSlot[] = [];
      const bucketDays = 7;
      for (let i = 0; i < 4; i++) {
        const bucketStart = new Date(start);
        bucketStart.setDate(bucketStart.getDate() + i * bucketDays);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketEnd.getDate() + bucketDays);
        const startMs = bucketStart.getTime();
        const endMs = i === 3 ? end.getTime() + 1 : bucketEnd.getTime();
        const bucketResults = results.filter((r) => {
          const t = new Date(r.datetime).getTime();
          return t >= startMs && t < endMs;
        });
        slots.push({
          dateString: `week-${i}-${bucketStart.toISOString().slice(0, 10)}`,
          name: `Week ${i + 1}`,
          results: bucketResults,
        });
      }
      return slots;
    }

    // 180 days or "all": bucket by month
    const monthSlots: ChartSlot[] = [];
    let monthStart: Date;
    let monthEnd: Date;

    if (days === 180) {
      monthEnd = new Date(today);
      monthStart = new Date(today.getFullYear(), today.getMonth() - 5, 1, 0, 0, 0, 0);
    } else {
      // "all" – from first to last result month
      if (results.length === 0) return [];
      const dates = results.map((r) => new Date(r.datetime));
      const min = new Date(Math.min(...dates.map((d) => d.getTime())));
      const max = new Date(Math.max(...dates.map((d) => d.getTime())));
      monthStart = new Date(min.getFullYear(), min.getMonth(), 1);
      monthEnd = new Date(max.getFullYear(), max.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const currentMonth = new Date(monthStart);
    const multiYear = monthEnd.getFullYear() !== monthStart.getFullYear();

    while (currentMonth <= monthEnd) {
      const rangeStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getTime();
      const rangeEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const bucketResults = results.filter((r) => {
        const t = new Date(r.datetime).getTime();
        return t >= rangeStart && t <= rangeEnd;
      });
      monthSlots.push({
        dateString: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`,
        name: multiYear ? intlFormatMonthYear.format(currentMonth) : intlFormatMonth.format(currentMonth),
        results: bucketResults,
      });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    return monthSlots;
  };

  const slots = buildSlots();

  switch (category) {
    case "speed": {
      return slots.map(({ dateString, name, results: res }) => {
        const wpm = res.length
          ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
          : 0;
        return { dateString, name, wpm: Number(wpm.toFixed(0)) };
      });
    }
    case "accuracy": {
      return slots.map(({ dateString, name, results: res }) => {
        const total = res.reduce((acc, r) => acc + r.correct + r.incorrect, 0);
        const correct = res.reduce((acc, r) => acc + r.correct, 0);
        const accuracy = total > 0 ? (correct / total) * 100 : 0;
        return { dateString, name, accuracy: Number(accuracy.toFixed(0)) };
      });
    }
    case "ergonomics": {
      return slots.map(({ dateString, name, results: res }) => {
        const total = res.reduce((acc, r) => acc + r.correct + r.incorrect, 0);
        const correct = res.reduce((acc, r) => acc + r.correct, 0);
        const accuracy = total > 0 ? (correct / total) * 100 : 0;
        const wpm = res.length
          ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
          : 0;
        const duration = res.reduce(
          (acc, r) => acc.plus(Duration.fromISO(r.time)),
          Duration.fromMillis(0)
        );
        const breakFrequency = res.reduce((acc, r, i) => {
          if (i === 0) return acc;
          const previous = new Date(res[i - 1].datetime);
          const current = new Date(r.datetime);
          return (
            acc +
            (current.getTime() -
              previous.getTime() +
              Duration.fromISO(r.time).milliseconds)
          );
        }, 0);

        const score =
          0.3 * wpm +
          0.3 * accuracy -
          0.2 * duration.as("minutes") +
          0.2 * breakFrequency +
          0.3 * 10;
        return { dateString, name, score: Number(score.toFixed(0)) };
      });
    }
    case "practice": {
      const formatPracticeLabel = (d: Duration) => {
        const secs = Math.floor(d.as("seconds"));
        if (secs >= 60) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
        return `${secs}s`;
      };
      return slots.map(({ dateString, name, results: res }) => {
        const total = res.reduce(
          (acc, r) => acc.plus(Duration.fromISO(r.time)),
          Duration.fromMillis(0)
        );
        return {
          dateString,
          name,
          minutes: total.as("minutes"),
          label: formatPracticeLabel(total),
        };
      });
    }
    case "rhythm": {
      return slots.map(({ dateString, name, results: res }) => {
        if (res.length === 0) return { dateString, name, consistency: 0 };

        const totalPairs = res.reduce(
          (acc, r) => acc + Math.max(0, r.keyPresses.length - 1),
          0
        );
        if (totalPairs === 0) return { dateString, name, consistency: 0 };

        let sumDiffs = 0;
        for (const r of res) {
          const kp = r.keyPresses;
          for (let i = 1; i < kp.length; i++) {
            const prev = kp[i - 1].timestamp;
            const curr = kp[i].timestamp;
            if (prev != null && curr != null) sumDiffs += curr - prev;
          }
        }
        const mean = sumDiffs / totalPairs;

        let sumSq = 0;
        for (const r of res) {
          const kp = r.keyPresses;
          for (let i = 1; i < kp.length; i++) {
            const prev = kp[i - 1].timestamp;
            const curr = kp[i].timestamp;
            if (prev != null && curr != null)
              sumSq += Math.pow(curr - prev - mean, 2);
          }
        }
        const variance = sumSq / totalPairs;
        const stdDev = Math.sqrt(variance);

        return {
          dateString,
          name,
          consistency: Number(stdDev.toFixed(2)),
        };
      });
    }
    default:
      return slots.map(({ dateString, name }) => ({
        dateString,
        name,
        value: 0,
      }));
  }
}
