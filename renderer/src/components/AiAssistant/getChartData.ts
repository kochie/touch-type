import { Result, useResults } from "@/lib/result-provider";
import { Duration } from "luxon";

// Function to get chart data for each category
export const getChartData = (category) => {
  const { results } = useResults();

  // results is an array of each typing test result
  // bucket these results into dates and calculate the average for each day

  const resultsByDate = results.reduce((acc, result) => {
    const date = new Date(result.datetime).toLocaleDateString();

    if (acc.has(date)) {
      const sameDate = acc.get(date)!;
      sameDate.push(result);
      const sorted = sameDate.sort(
        (a, b) =>
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      );
      acc.set(date, [...sorted]);
    } else {
      acc.set(date, [result]);
    }

    return acc;
  }, new Map<string, Result[]>());

  console.log("RESULTS SORTED", resultsByDate);

  switch (category) {
    case "speed": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const wpm = res
            ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
            : 0;
          return { name: intlFormat.format(date), wpm: wpm.toFixed(0) };
        });

      // const data = Object.entries(resultsByDate).map(([date, res]) => {
      //     const wpm = res.reduce((acc, r) => acc + r.cpm, 0) / results.length;
      //     return { name: date, wpm };
      // });
      return data.reverse();
    }
    case "accuracy": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce((acc, r) => acc + r.correct + r.incorrect, 0) ?? 0;
          const correct = res?.reduce((acc, r) => acc + r.correct, 0) ?? 0;
          return {
            name: intlFormat.format(date),
            accuracy: ((correct / total) * 100).toFixed(0),
          };
        });

      return data.reverse();
    }
    case "ergonomics": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce((acc, r) => acc + r.correct + r.incorrect, 0) ?? 0;
          const correct = res?.reduce((acc, r) => acc + r.correct, 0) ?? 0;
          const accuracy = (correct / total) * 100;
          const wpm = res
            ? res.reduce((acc, r) => acc + r.cpm, 0) / res.length
            : 0;
          const duration = res
            ? res.reduce(
                (acc, r) => acc.plus(Duration.fromISO(r.time)),
                Duration.fromMillis(0),
              )
            : Duration.fromMillis(0);
          // break frequency is the gap between each test summed together
          const breakFrequency = res
            ? res.reduce((acc, r, i) => {
                if (i === 0) return acc;
                const previous = new Date(res[i - 1].datetime);
                const current = new Date(r.datetime);
                return (
                  acc +
                  (current.getTime() -
                    previous.getTime() +
                    Duration.fromISO(r.time).milliseconds)
                );
              }, 0)
            : 0;

          return {
            name: intlFormat.format(date),
            score: (
              0.3 * wpm +
              0.3 * accuracy -
              0.2 * duration.as("minutes") +
              0.2 * breakFrequency +
              0.3 * 10
            ).toFixed(0),
          };
        });

      return data.reverse();
    }
    case "practice": {
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          const total =
            res?.reduce(
              (acc, r) => acc.plus(Duration.fromISO(r.time)),
              Duration.fromMillis(0),
            ) ?? Duration.fromMillis(0);
          return {
            name: intlFormat.format(date),
            minutes: total.as("minutes"),
            label: total.rescale().toHuman(),
          };
        });

      return data.reverse();
    }
    case "rhythm":
      const intlFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });
      const data = Array(7)
        .fill(0)
        .map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toLocaleDateString();
          const res = resultsByDate.get(dateString);
          // calculate standard deviation of time for each test
          if (!res) return { name: intlFormat.format(date), consistency: 0 };

          // for each result, calculate the mean, variance, and standard deviation of the time between keypresses
          
          if (res[0].keyPresses[0].timestamp === undefined) return { name: intlFormat.format(date), consistency: 0 };

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
            name: intlFormat.format(date),
            consistency: stdDev.toFixed(2),
          };
        }); 

      console.log("RHYTHM DATA", data);
      return data.reverse();
  }
};