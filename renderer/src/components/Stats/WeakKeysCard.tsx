"use client";

import { useResults } from "@/lib/result-provider";
import type { KeyboardLayoutNames } from "@/keyboards";

interface WeakKeysCardProps {
  keyboard: KeyboardLayoutNames;
  topN?: number;
}

interface KeyStat {
  key: string;
  errors: number;
  total: number;
  accuracy: number;
}

function getWeakKeys(
  results: { keyboard: string; keyPresses: { key: string; correct: boolean }[] }[],
  keyboard: string,
  topN: number
): KeyStat[] {
  const byKey = new Map<string, { correct: number; total: number }>();

  for (const r of results) {
    if (r.keyboard !== keyboard) continue;
    for (const kp of r.keyPresses) {
      const key = kp.key;
      const cur = byKey.get(key) ?? { correct: 0, total: 0 };
      cur.total += 1;
      if (kp.correct) cur.correct += 1;
      byKey.set(key, cur);
    }
  }

  const stats: KeyStat[] = [];
  byKey.forEach((v, key) => {
    if (v.total < 5) return; // require minimum sample
    const errors = v.total - v.correct;
    if (errors === 0) return;
    stats.push({
      key,
      errors,
      total: v.total,
      accuracy: (v.correct / v.total) * 100,
    });
  });

  stats.sort((a, b) => b.errors - a.errors);
  return stats.slice(0, topN);
}

export default function WeakKeysCard({ keyboard, topN = 15 }: WeakKeysCardProps) {
  const { results } = useResults();
  const weakKeys = getWeakKeys(results, keyboard, topN);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Keys to focus on
      </h3>
      {weakKeys.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Not enough data yet. Keep practicing to see which keys need work.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Key</th>
                <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">Errors</th>
                <th className="text-right py-2 font-medium text-gray-700 dark:text-gray-300">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {weakKeys.map(({ key: k, errors, accuracy }) => (
                <tr key={k} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-1.5 font-mono text-gray-900 dark:text-gray-100">{k === " " ? "Space" : k}</td>
                  <td className="text-right py-1.5 text-gray-600 dark:text-gray-400">{errors}</td>
                  <td className="text-right py-1.5 text-gray-600 dark:text-gray-400">{accuracy.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
