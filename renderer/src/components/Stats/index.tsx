"use client";

import { KeyboardLayoutNames } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { useStreak, getNextMilestone } from "@/lib/streak_hook";
import { faFire, faSnowflake } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

export default function TopStats({ keyboard }: TopStatsProps) {
  const [keyboardBest, setKeyboardBest] = useState<Stat>({name: "", stat: "", previousStat: "", changeType: "", change: ""});
  const [averageCpm, setAverageCpm] = useState<Stat>({name: "", stat: "", previousStat: "", changeType: "", change: ""});
  const { results } = useResults();
  
  // Use the streak hook for server-side streak data
  const { 
    currentStreak, 
    longestStreak, 
    isAtRisk, 
    freezesAvailable, 
    isPremium,
    isLoading: streakLoading 
  } = useStreak();

  useEffect(() => {
    const computed: Result[] = results.filter(
      (res) => res.keyboard === keyboard,
    );

    setKeyboardBest({
      name: "Best Keyboard",
      stat: keyboard,
      previousStat: "",
      change: "0",
      changeType: "increase",
    })

    const avgCpm = results.length > 0 
      ? results.map((res) => res.cpm).reduce((acc, curr) => acc + curr, 0) / results.length
      : 0;
    setAverageCpm({
      name: "Average CPM",
      stat: `${avgCpm.toFixed(2)} CPM`,
      previousStat: `${avgCpm.toFixed(2)} CPM`,
      change: "0",
      changeType: "increase",
    })
  }, [results, keyboard]);

  const nextMilestone = getNextMilestone(currentStreak);

  return (
    <div className="mx-40">
      {/* <h3 className="text-base font-semibold leading-6">Last 7 days</h3> */}
      <dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-gray-700">
        {averageCpm && <CPM averageCpm={averageCpm} />}
        {keyboardBest && <KeyboardBest keyboardBest={keyboardBest} />}
        <StreakCard 
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          isAtRisk={isAtRisk}
          freezesAvailable={freezesAvailable}
          isPremium={isPremium}
          isLoading={streakLoading}
          nextMilestone={nextMilestone}
        />
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

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  isAtRisk: boolean;
  freezesAvailable: number;
  isPremium: boolean;
  isLoading: boolean;
  nextMilestone: number | null;
}

const StreakCard = ({ 
  currentStreak, 
  longestStreak, 
  isAtRisk, 
  freezesAvailable, 
  isPremium,
  isLoading,
  nextMilestone 
}: StreakCardProps) => {
  if (isLoading) {
    return (
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-base font-normal text-gray-900 dark:text-gray-100">Current Streak</dt>
        <dd className="mt-1">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </dd>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:p-6">
      <dt className="text-base font-normal text-gray-900 dark:text-gray-100 flex items-center gap-2">
        Current Streak
        {isPremium && freezesAvailable > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-blue-500">
            <FontAwesomeIcon icon={faSnowflake} className="w-3 h-3" />
            {freezesAvailable}
          </span>
        )}
      </dt>
      <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faFire}
            className={clsx(
              "w-8 h-8 transition-colors",
              currentStreak === 0 
                ? "text-gray-400" 
                : isAtRisk 
                  ? "text-orange-400 animate-pulse" 
                  : "text-orange-500"
            )} 
          />
          <span className={clsx(
            "text-2xl font-semibold",
            currentStreak === 0 
              ? "text-gray-500" 
              : isAtRisk 
                ? "text-orange-500" 
                : "text-indigo-600 dark:text-indigo-400"
          )}>
            {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Best: {longestStreak} days
          </span>
          {isAtRisk && currentStreak > 0 && (
            <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300 animate-pulse">
              Practice today!
            </span>
          )}
          {nextMilestone && currentStreak > 0 && !isAtRisk && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {nextMilestone - currentStreak} to next milestone
            </span>
          )}
        </div>
      </dd>
    </div>
  );
};