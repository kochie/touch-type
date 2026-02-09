"use client";

import { useResults } from "@/lib/result-provider";
import { useStreak } from "@/lib/streak_hook";
import type { KeyboardLayoutNames } from "@/keyboards";

interface PersonalRecordsCardProps {
  keyboard: KeyboardLayoutNames;
}

export default function PersonalRecordsCard({ keyboard }: PersonalRecordsCardProps) {
  const { results } = useResults();
  const { longestStreak } = useStreak();

  const filtered = results.filter((r) => r.keyboard === keyboard);

  const bestCpmResult = filtered.length
    ? filtered.reduce((best, r) => (r.cpm > best.cpm ? r : best), filtered[0])
    : null;
  const bestAccuracyResult = filtered.length
    ? filtered.reduce((best, r) => {
        const total = r.correct + r.incorrect;
        const acc = total > 0 ? (r.correct / total) * 100 : 0;
        const bestTotal = best.correct + best.incorrect;
        const bestAcc = bestTotal > 0 ? (best.correct / bestTotal) * 100 : 0;
        return acc > bestAcc ? r : best;
      }, filtered[0])
    : null;

  const bestCpm = bestCpmResult?.cpm ?? 0;
  const bestCpmDate = bestCpmResult?.datetime
    ? new Date(bestCpmResult.datetime).toLocaleDateString()
    : null;
  const bestAccuracy =
    bestAccuracyResult != null && bestAccuracyResult.correct + bestAccuracyResult.incorrect > 0
      ? (
          (bestAccuracyResult.correct /
            (bestAccuracyResult.correct + bestAccuracyResult.incorrect)) *
          100
        ).toFixed(1)
      : null;
  const bestAccuracyDate = bestAccuracyResult?.datetime
    ? new Date(bestAccuracyResult.datetime).toLocaleDateString()
    : null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Personal records
      </h3>
      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Best CPM</dt>
          <dd className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
            {bestCpm > 0 ? `${Math.round(bestCpm)} CPM` : "—"}
            {bestCpmDate && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                {bestCpmDate}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Best accuracy (single test)</dt>
          <dd className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
            {bestAccuracy != null ? `${bestAccuracy}%` : "—"}
            {bestAccuracyDate && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                {bestAccuracyDate}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Longest streak</dt>
          <dd className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
            {longestStreak > 0 ? `${longestStreak} days` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
