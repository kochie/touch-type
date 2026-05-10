"use client";

import { HeatmapCanvas } from "@/components/HeatmapCanvas";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import PageHeader from "@/components/PageHeader";
import { faChartRadar } from "@fortawesome/pro-regular-svg-icons";
import { useState } from "react";
import clsx from "clsx";

type TimeRange = "7d" | "30d" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

export default function HeatmapPage() {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  return (
    <div>
      <PageHeader
        icon={faChartRadar}
        title="Key Map"
        subtitle="See which keys you miss most"
        iconBg="bg-rose-400/10"
        iconColor="text-rose-400"
      >
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <KeyboardSelect
              selectedKeyboardName={keyboard}
              setSelectedKeyboard={setKeyboard}
              label="Keyboard Layout"
              description="Select a keyboard layout to display the heatmap of incorrect key taps."
            />
          </div>
          <div className="flex gap-1.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150",
                  timeRange === range.value
                    ? "bg-rose-400/10 text-rose-400 border border-rose-400/30"
                    : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <div className="px-6">
        <HeatmapCanvas keyboardName={keyboard} />
      </div>
    </div>
  );
}
