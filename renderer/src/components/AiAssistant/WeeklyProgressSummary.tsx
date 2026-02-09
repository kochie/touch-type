"use client";

import { useResults } from "@/lib/result-provider";
import { Duration } from "luxon";

function getWeekBounds(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - 7 * (weeksAgo + 1));
  start.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(start);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  if (weeksAgo === 0) {
    return { start, end };
  }
  return { start, end: endOfWeek };
}

export function WeeklyProgressSummary() {
  const { results } = useResults();

  const thisWeek = getWeekBounds(0);
  const lastWeek = getWeekBounds(1);

  const inThisWeek = (r: { datetime: string }) => {
    const d = new Date(r.datetime);
    return d >= thisWeek.start && d <= thisWeek.end;
  };
  const inLastWeek = (r: { datetime: string }) => {
    const d = new Date(r.datetime);
    return d >= lastWeek.start && d <= lastWeek.end;
  };

  const thisWeekResults = results.filter(inThisWeek);
  const lastWeekResults = results.filter(inLastWeek);

  const totalMinutes = (rs: typeof results) =>
    rs.reduce(
      (acc, r) => acc + Duration.fromISO(r.time).as("minutes"),
      0
    );
  const bestCpm = (rs: typeof results) =>
    rs.length ? Math.max(...rs.map((r) => r.cpm)) : 0;
  const avgAccuracy = (rs: typeof results) => {
    if (!rs.length) return 0;
    const total = rs.reduce((acc, r) => acc + r.correct + r.incorrect, 0);
    const correct = rs.reduce((acc, r) => acc + r.correct, 0);
    return total > 0 ? (correct / total) * 100 : 0;
  };

  const thisMinutes = totalMinutes(thisWeekResults);
  const lastMinutes = totalMinutes(lastWeekResults);
  const thisCpm = bestCpm(thisWeekResults);
  const lastCpm = bestCpm(lastWeekResults);
  const thisAcc = avgAccuracy(thisWeekResults);
  const lastAcc = avgAccuracy(lastWeekResults);

  const cpmDiff = lastCpm > 0 ? ((thisCpm - lastCpm) / lastCpm) * 100 : 0;
  const accDiff = lastAcc > 0 ? thisAcc - lastAcc : 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
        This week
      </h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Practice time</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {thisMinutes.toFixed(1)} min
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Best CPM</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {thisCpm > 0 ? Math.round(thisCpm) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Average accuracy</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {thisAcc > 0 ? `${thisAcc.toFixed(1)}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Vs last week</dt>
          <dd className="font-medium">
            {lastCpm > 0 || lastAcc > 0 ? (
              <span className={cpmDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {cpmDiff >= 0 ? "+" : ""}
                {cpmDiff.toFixed(0)}% CPM
                {accDiff !== 0 && ` · ${accDiff >= 0 ? "+" : ""}${accDiff.toFixed(1)}% accuracy`}
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">No previous week data</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
