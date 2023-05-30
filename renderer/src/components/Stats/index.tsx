"use client";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/20/solid";
import { Duration, DateTime } from "luxon";
import { useEffect, useState } from "react";

const testStats = [
  {
    name: "Accuracy",
    stat: "71,897",
    previousStat: "70,946",
    change: "12%",
    changeType: "increase",
  },
  {
    name: "Speed",
    stat: "58.16%",
    previousStat: "56.14%",
    change: "2.02%",
    changeType: "increase",
  },
  {
    name: "Streak",
    stat: "24.57%",
    previousStat: "28.62%",
    change: "4.05%",
    changeType: "decrease",
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

interface Stat {
  name: string;
  stat: string;
  previousStat: string;
  changeType: string;
  change: string;
}

interface Result {
  correct: number;
  incorrect: number;
  cpm: number;
  level: number;
  keyboard: string;
  language: string;
  datetime: number;
}

function calculateAverageCorrect(results: Result[]) {
  const correct = results.reduce((acc, curr) => {
    return acc + curr.correct;
  }, 0);
  const total = results.reduce((acc, curr) => {
    return acc + curr.correct + curr.incorrect;
  }, 0);

  return correct / total;
}

export default function TopStats() {
  const [stats, setStats] = useState<Stat[]>(testStats);

  useEffect(() => {
    if (!localStorage) return;

    const storedResults = JSON.parse(localStorage.getItem("results") ?? "[]");
    const computed: Result[] = storedResults.map((res) => ({
      ...res,
      cpm:
        (res.correct + res.incorrect) /
        (Duration.fromISO(res.time).toMillis() / 1000 / 60),
    }));

    // console.log(computed);

    // using luxon get start of day

    // get the average accuracy for todays results
    const todaysResults = computed.filter((result) =>
      DateTime.fromMillis(result.datetime ?? 0).hasSame(DateTime.now(), "day")
    );

    const thisWeeksResults = computed.filter(
      (result) =>
        DateTime.fromMillis(result.datetime ?? 0) <
        DateTime.now().startOf("day")
    );

    const accuracy1 = calculateAverageCorrect(todaysResults);

    const accuracy2 = calculateAverageCorrect(thisWeeksResults);

    const accuracyDiff = accuracy1 - accuracy2;

    const accuracy: Stat = {
      name: "Accuracy",
      stat: (accuracy1 * 100).toFixed(2) + "%",
      previousStat: (accuracy2 * 100).toFixed(2) + "%",
      change: (accuracyDiff * 100).toFixed(2) + "%",
      changeType: accuracyDiff > 0 ? "increase" : "decrease",
    };

    const speed1 =
      todaysResults.reduce((acc, curr) => acc + curr.cpm, 0) /
      todaysResults.length;
    const speed2 =
      thisWeeksResults.reduce((acc, curr) => acc + curr.cpm, 0) /
      thisWeeksResults.length;
    const speed: Stat = {
      name: "Speed (CPM)",
      stat: speed1.toFixed(2),
      previousStat: speed2.toFixed(2),
      change: (speed1 - speed2).toFixed(2),
      changeType: speed1 > speed2 ? "increase" : "decrease",
    };

    const incorrect1 =
      todaysResults.reduce((acc, curr) => acc + curr.incorrect, 0) /
      todaysResults.length;
    const incorrect2 =
      thisWeeksResults.reduce((acc, curr) => acc + curr.incorrect, 0) /
      thisWeeksResults.length;
    const streak: Stat = {
      name: "Average Error",
      stat: incorrect1.toFixed(2),
      previousStat: incorrect2.toFixed(2),
      change: (incorrect1 - incorrect2).toFixed(2),
      changeType: incorrect1 < incorrect2 ? "increase" : "decrease",
    };

    setStats([accuracy, speed, streak]);
  }, []);

  return (
    <div className="mx-40">
      <h3 className="text-base font-semibold leading-6">Last 7 days</h3>
      <dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-x md:divide-y-0">
        {stats.map((item) => (
          <div key={item.name} className="px-4 py-5 sm:p-6">
            <dt className="text-base font-normal text-gray-900">{item.name}</dt>
            <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                {item.stat}
                <span className="ml-2 text-sm font-medium text-gray-500">
                  from {item.previousStat}
                </span>
              </div>

              <div
                className={classNames(
                  item.changeType === "increase"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800",
                  "inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0"
                )}
              >
                {item.changeType === "increase" ? (
                  <ArrowUpIcon
                    className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-500"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowDownIcon
                    className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-red-500"
                    aria-hidden="true"
                  />
                )}

                <span className="sr-only">
                  {" "}
                  {item.changeType === "increase"
                    ? "Increased"
                    : "Decreased"}{" "}
                  by{" "}
                </span>
                {item.change}
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
