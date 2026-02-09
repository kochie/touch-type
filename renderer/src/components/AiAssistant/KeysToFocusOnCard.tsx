"use client";

import { useResults } from "@/lib/result-provider";
import { Card } from "./Card";

const TOP_N = 12;

interface KeyStat {
  key: string;
  errors: number;
  total: number;
  accuracy: number;
}

function getWeakKeysFromResults(
  results: { keyPresses: { key: string; correct: boolean }[] }[],
  topN: number
): KeyStat[] {
  const byKey = new Map<string, { correct: number; total: number }>();

  for (const r of results) {
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
    if (v.total < 5) return;
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

export function KeysToFocusOnCard() {
  const { results } = useResults();
  const weakKeys = getWeakKeysFromResults(results, TOP_N);

  return (
    <Card
      header={
        <h2 className="text-lg font-semibold">Keys to focus on</h2>
      }
    >
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
    </Card>
  );
}
