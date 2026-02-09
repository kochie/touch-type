"use client";

import { Barline, BestForEachLevel } from "@/components/Charts";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import TopStats from "@/components/Stats";
import CpmAccuracyTrendChart from "@/components/Stats/CpmAccuracyTrendChart";
import PracticeTimeChart from "@/components/Stats/PracticeTimeChart";
import {
  CHART_RANGE_LABELS,
  type ChartDataRange,
} from "@/components/AiAssistant/getChartData";
import { KeyboardLayoutNames } from "@/keyboards";
import { usePlan } from "@/lib/plan_hook";
import React, { useState } from "react";

const RANGE_OPTIONS: ChartDataRange[] = ["all", 180, 30, 14, 7];

const StatsPage = () => {
  const [selectedKeyboards, setSelectedKeyboards] = useState<KeyboardLayoutNames[]>([
    KeyboardLayoutNames.MACOS_US_QWERTY,
  ]);
  const [proStatsRange, setProStatsRange] = useState<ChartDataRange>(14);
  const plan = usePlan();
  const isPremium = plan?.billing_plan === "premium";
  const primaryKeyboard = selectedKeyboards[0] ?? KeyboardLayoutNames.MACOS_US_QWERTY;

  return (
    <div className="my-5">
      <div className="max-w-4xl mx-auto">
        <KeyboardSelect
          multiple
          selectedKeyboardNames={selectedKeyboards}
          setSelectedKeyboards={setSelectedKeyboards}
          label="Keyboard Layout"
          description="Select one or more layouts to compare. Best per level shows each layout separately."
        />
      </div>
      <div className="py-10">
        <BestForEachLevel keyboards={selectedKeyboards} />
      </div>
      <Barline keyboards={selectedKeyboards} />

      {isPremium ? (
        <section className="mt-12 max-w-4xl mx-auto" aria-label="Pro stats">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Pro stats
            </h2>
            <div className="flex items-center gap-2">
              <label
                htmlFor="pro-stats-range"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Range:
              </label>
              <select
                id="pro-stats-range"
                value={proStatsRange}
                onChange={(e) => {
                  const v = e.target.value;
                  setProStatsRange((v === "all" ? "all" : Number(v)) as ChartDataRange);
                }}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {RANGE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {CHART_RANGE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-8">
            <CpmAccuracyTrendChart keyboard={primaryKeyboard} range={proStatsRange} />
            <PracticeTimeChart keyboard={primaryKeyboard} range={proStatsRange} />
          </div>
        </section>
      ) : (
        <section className="mt-12 max-w-4xl mx-auto">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Upgrade to see Pro stats: CPM trend and practice time.
            </p>
            <a
              href={process.env["NEXT_PUBLIC_ACCOUNT_LINK"] ?? "https://touch-typer.kochie.io/account"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Account settings →
            </a>
          </div>
        </section>
      )}
    </div>
  );
};

export default StatsPage;
