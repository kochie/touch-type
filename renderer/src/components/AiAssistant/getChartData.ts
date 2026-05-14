import { Result, useResults } from "@/lib/result-provider";
import { durationToMs } from "@/lib/duration";

type ChartDatum = { name: string; [key: string]: string | number };

// Function to get chart data for each category
export const getChartData = (category): ChartDatum[] => {
  const { results } = useResults();

  // results is an array of each typing test result
  // bucket these results into dates and calculate the average for each day

  const resultsByDate = results.reduce((acc, result) => {
    const date = Temporal.Instant.from(result.datetime)
      .toZonedDateTimeISO(Temporal.Now.timeZoneId())
      .toPlainDate()
      .toLocaleString("en");

    if (acc.has(date)) {
      const sameDate = acc.get(date)!;
      sameDate.push(result);
      const sorted = sameDate.sort(
        (a, b) =>
          Temporal.Instant.from(a.datetime).epochMilliseconds -
          Temporal.Instant.from(b.datetime).epochMilliseconds,
      );
      acc.set(date, [...sorted]);
    } else {
      acc.set(date, [result]);
    }

    return acc;
  }, new Map<string, Result[]>());


  switch (category) {
    case "speed": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const today = Temporal.Now.plainDateISO();
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const plainDate = today.subtract({ days: i });
          const dateString = plainDate.toLocaleString("en");
          const res = resultsByDate.get(dateString);
          const wpm = res
            ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
            : 0;
          const jsDate = new Date(plainDate.toString());
          return { name: intlFormat.format(jsDate), wpm: wpm.toFixed(0) };
        });

      return data.reverse();
    }
    case "accuracy": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const today = Temporal.Now.plainDateISO();
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const plainDate = today.subtract({ days: i });
          const dateString = plainDate.toLocaleString("en");
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce((acc, r) => acc + r.correct + r.incorrect, 0) ?? 0;
          const correct = res?.reduce((acc, r) => acc + r.correct, 0) ?? 0;
          const jsDate = new Date(plainDate.toString());
          return {
            name: intlFormat.format(jsDate),
            accuracy: ((correct / total) * 100).toFixed(0),
          };
        });

      return data.reverse();
    }
    case "ergonomics": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const today = Temporal.Now.plainDateISO();
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const plainDate = today.subtract({ days: i });
          const dateString = plainDate.toLocaleString("en");
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce((acc, r) => acc + r.correct + r.incorrect, 0) ?? 0;
          const correct = res?.reduce((acc, r) => acc + r.correct, 0) ?? 0;
          const accuracy = (correct / total) * 100;
          const wpm = res
            ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
            : 0;
          const durationMs = res
            ? res.reduce((acc, r) => acc + durationToMs(r.time), 0)
            : 0;
          const durationMinutes = durationMs / 1000 / 60;
          // break frequency is the gap between each test summed together
          const breakFrequency = res
            ? res.reduce((acc, r, i) => {
                if (i === 0) return acc;
                const previousMs = Temporal.Instant.from(res[i - 1].datetime).epochMilliseconds;
                const currentMs = Temporal.Instant.from(r.datetime).epochMilliseconds;
                return acc + (currentMs - previousMs + durationToMs(r.time));
              }, 0)
            : 0;

          const jsDate = new Date(plainDate.toString());
          return {
            name: intlFormat.format(jsDate),
            score: (
              0.3 * wpm +
              0.3 * accuracy -
              0.2 * durationMinutes +
              0.2 * breakFrequency +
              0.3 * 10
            ).toFixed(0),
          };
        });

      return data.reverse();
    }
    case "practice": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const today = Temporal.Now.plainDateISO();
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const plainDate = today.subtract({ days: i });
          const dateString = plainDate.toLocaleString("en");
          const res = resultsByDate.get(dateString);
          const totalMs = res
            ? res.reduce((acc, r) => acc + durationToMs(r.time), 0)
            : 0;
          const totalMinutes = totalMs / 1000 / 60;
          const totalSecs = Math.floor(totalMs / 1000);
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
          const jsDate = new Date(plainDate.toString());
          return {
            name: intlFormat.format(jsDate),
            minutes: totalMinutes,
            label,
          };
        });

      return data.reverse();
    }
    case "rhythm": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const today = Temporal.Now.plainDateISO();
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const plainDate = today.subtract({ days: i });
          const dateString = plainDate.toLocaleString("en");
          const res = resultsByDate.get(dateString);
          const jsDate = new Date(plainDate.toString());
          // calculate standard deviation of time for each test
          if (!res) return { name: intlFormat.format(jsDate), consistency: 0 };

          // for each result, calculate the mean, variance, and standard deviation of the time between keypresses

          if (res[0].keyPresses[0].timestamp === undefined) return { name: intlFormat.format(jsDate), consistency: 0 };

          const mean = res.reduce(
            (acc, r) => {
              return acc + r.keyPresses.reduce((acc, curr, i, arr) => {
                if (i === 0) return acc;
                const previous = arr[i - 1];
                return acc + (curr.timestamp! - previous.timestamp!);
              }, 0);
            },
            0,
          ) / res.reduce((acc, r) => acc + r.keyPresses.length - 1, 0);

          const variance = res.reduce(
            (acc, r) => {
              return acc + r.keyPresses.reduce((acc, curr, i, arr) => {
                if (i === 0) return acc;
                const previous = arr[i - 1];
                return acc + Math.pow((curr.timestamp! - previous.timestamp!) - mean, 2);
              }, 0);
            },
            0,
          ) / res.reduce((acc, r) => acc + r.keyPresses.length - 1, 0);

          const stdDev = Math.sqrt(variance);

          return {
            name: intlFormat.format(jsDate),
            consistency: stdDev.toFixed(2),
          };
        });

      return data.reverse();
    }
    default:
      return [];
  }
};
