"use client";

import { KeyboardLayoutNames } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { Duration, DateTime } from "luxon";
import { useEffect, useState } from "react";

interface Stat {
  name: string;
  stat: string;
  previousStat: string;
  changeType: string;
  change: string;
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

interface TopStatsProps {
  keyboard: KeyboardLayoutNames;
}

// 

export default function TopStats({ keyboard }: TopStatsProps) {
  const [keyboardBest, setKeyboardBest] = useState<Stat>({name: "", stat: "", previousStat: "", changeType: "", change: ""});
  const [averageCpm, setAverageCpm] = useState<Stat>({name: "", stat: "", previousStat: "", changeType: "", change: ""});
  const [streak, setStreak] = useState<Stat>({
    name: "Streak",
    stat: "0",
    previousStat: "0",
    change: "0",
    changeType: "increase",
  });
  const { results } = useResults();

  useEffect(() => {
    const computed: Result[] = results.filter(
      (res) => res.keyboard === keyboard,
    );

    // get the average accuracy for todays results
    const todaysResults = computed.filter((result) =>
      DateTime.fromISO(result.datetime ?? 0).hasSame(DateTime.now(), "day"),
    );

    const previousResults = computed.filter(
      (result) =>
        DateTime.fromISO(result.datetime) < DateTime.now().startOf("day"),
    );

    // number of days with results starting today.
    const uniqueDays = Array.from(new Set(
      computed.map((res) => DateTime.fromISO(res.datetime).toISODate()),
    ));

    console.log("UNIQUE DAYS", uniqueDays);

    console.log("RESULTS", todaysResults, previousResults, computed);
    // if (todaysResults.length === 0 || previousResults.length === 0) {
    //   return;
    // }

    // const averageCpm = results.map((res) => res.cpm).reduce((acc, curr) => acc + curr, 0) / results.length;



    

    // const accuracy1 = calculateAverageCorrect(todaysResults);
    // const accuracy2 = calculateAverageCorrect(thisWeeksResults);
    // const accuracyDiff = accuracy1 - accuracy2;

    // setAccuracy((prev) => ({
    //   name: "Accuracy",
    //   stat: (accuracy1 * 100).toFixed(2) + "%",
    //   previousStat: (accuracy2 * 100).toFixed(2) + "%",
    //   change: (accuracyDiff * 100).toFixed(2) + "%",
    //   changeType: accuracyDiff > 0 ? "increase" : "decrease",
    // }));

    // const speed1 =
    //   todaysResults.reduce((acc, curr) => acc + curr.cpm, 0) /
    //   todaysResults.length;
    // const speed2 =
    //   thisWeeksResults.reduce((acc, curr) => acc + curr.cpm, 0) /
    //   thisWeeksResults.length;
    // const newSpeed: Stat = {
    //   name: "Speed (CPM)",
    //   stat: speed1.toFixed(2),
    //   previousStat: speed2.toFixed(2),
    //   change: (speed1 - speed2).toFixed(2),
    //   changeType: speed1 > speed2 ? "increase" : "decrease",
    // };

    setKeyboardBest({
      name: "Best Keyboard",
      stat: keyboard,
      previousStat: "",
      change: "0",
      changeType: "increase",
    })

    const avgCpm = results.map((res) => res.cpm).reduce((acc, curr) => acc + curr, 0) / results.length
    setAverageCpm({
      name: "Average CPM",
      stat: `${avgCpm.toFixed(2)} CPM`,
      previousStat: `${avgCpm.toFixed(2)} CPM`,
      change: "0",
      changeType: "increase",
    })


    
    const currentStreak = getCurrentStreak(results.map((res) => new Date(res.datetime).toDateString()))
    const [bestStreak, secondBestStreak] = getStreaks(results.map((res) => new Date(res.datetime).toDateString()))

    console.log("CURRENT STREAK", currentStreak, bestStreak, secondBestStreak);

    setStreak({
      name: "Current Streak",
      stat: `${currentStreak} days`,
      previousStat: currentStreak === bestStreak ? `${secondBestStreak} days` : `${bestStreak} days`,
      change: `${Math.abs(bestStreak - secondBestStreak)} days`,
      changeType: currentStreak === bestStreak ? "increase" : "decrease",
    })
  }, [results]);

  return (
    <div className="mx-40">
      {/* <h3 className="text-base font-semibold leading-6">Last 7 days</h3> */}
      <dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-x md:divide-y-0">
        {averageCpm && <CPM averageCpm={averageCpm} />}
        {keyboardBest && <KeyboardBest keyboardBest={keyboardBest} />}
        {streak && <Streak streak={streak} />}
      </dl>
    </div>
  );
}

const CPM = ({ averageCpm }: { averageCpm: Stat }) => (
  <div key={averageCpm.name} className="px-4 py-5 sm:p-6">
    <dt className="text-base font-normal text-gray-900">{averageCpm.name}</dt>
    <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
      <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
        {averageCpm.stat}
        <span className="ml-2 text-sm font-medium text-gray-500">
          from {averageCpm.previousStat}
        </span>
      </div>

      <div
        className={clsx(
          averageCpm.changeType === "increase"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800",
          "inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0",
        )}
      >
        {averageCpm.changeType === "increase" ? (
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
          {averageCpm.changeType === "increase"
            ? "Increased"
            : "Decreased"} by{" "}
        </span>
        {averageCpm.change}
      </div>
    </dd>
  </div>
);

const KeyboardBest = ({ keyboardBest }: { keyboardBest: Stat }) => (
  <div key={keyboardBest.name} className="px-4 py-5 sm:p-6">
    <dt className="text-base font-normal text-gray-900">{keyboardBest.name}</dt>
    <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
      <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
        {keyboardBest.stat}
        <span className="ml-2 text-sm font-medium text-gray-500">
          from {keyboardBest.previousStat}
        </span>
      </div>

      <div
        className={clsx(
          keyboardBest.changeType === "increase"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800",
          "inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0",
        )}
      >
        {keyboardBest.changeType === "increase" ? (
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
          {keyboardBest.changeType === "increase" ? "Increased" : "Decreased"} by{" "}
        </span>
        {keyboardBest.change}
      </div>
    </dd>
  </div>
);

const Streak = ({ streak }: { streak: Stat }) => (
  <div key={streak.name} className="px-4 py-5 sm:p-6">
    <dt className="text-base font-normal text-gray-900">{streak.name}</dt>
    <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
      <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
        {streak.stat}
        <span className="ml-2 text-sm font-medium text-gray-500">
          from {streak.previousStat}
        </span>
      </div>

      <div
        className={clsx(
          streak.changeType === "increase"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800",
          "inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0",
        )}
      >
        {streak.changeType === "decrease" ? (
          <ArrowUpIcon
            className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-red-500"
            aria-hidden="true"
          />
        ) : (
          <ArrowDownIcon
            className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-500"
            aria-hidden="true"
          />
        )}

        <span className="sr-only">
          {" "}
          {streak.changeType === "increase" ? "Increased" : "Decreased"} by{" "}
        </span>
        {streak.change}
      </div>
    </dd>
  </div>
);


function getStreaks(dates: string[]): number[] {
  if (dates.length === 0) return [0];

  // Remove duplicates and sort the dates in ascending order
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let streaks: number[] = [];
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    const previousDate = new Date(uniqueDates[i - 1]);

    // Normalize dates to remove the time component
    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);

    // Calculate the difference in days
    const diffInTime = currentDate.getTime() - previousDate.getTime();
    const diffInDays = diffInTime / (1000 * 3600 * 24);

    if (diffInDays === 1) {
      // The dates are consecutive
      currentStreak += 1;
    } else {
      // The streak is broken, push the current streak to the streaks array
      streaks.push(currentStreak);
      currentStreak = 1;
    }
  }

  // Add the last streak to the streaks array
  streaks.push(currentStreak);

  // Sort streaks in descending order to find the second best
  streaks.sort((a, b) => b - a);

  // Return the second best streak if it exists, otherwise return 0
  return streaks
}

function getCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Remove duplicates and sort the dates in ascending order
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let currentStreak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to remove time component

  for (let i = uniqueDates.length - 1; i > 0; i--) {
    const currentDate = new Date(uniqueDates[i]);
    currentDate.setHours(0, 0, 0, 0); // Normalize date to remove time component

    if (currentDate.getTime() === today.getTime() || i === uniqueDates.length - 1) {
      // Check if the last date is today or if we are starting from today
      const previousDate = new Date(uniqueDates[i - 1]);
      previousDate.setHours(0, 0, 0, 0);

      // Calculate the difference in days
      const diffInTime = currentDate.getTime() - previousDate.getTime();
      const diffInDays = diffInTime / (1000 * 3600 * 24);

      if (diffInDays === 1) {
        // The dates are consecutive
        currentStreak += 1;
      } else {
        // Break in the streak
        break;
      }
    }
  }

  return currentStreak;
}