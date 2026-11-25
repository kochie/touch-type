"use client";

import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import { interpolateRgb, max, scaleSequential } from "d3";
import KeyMapCard from "@/components/KeyMapCard";
import { keyLabel, useKeyStats } from "@/lib/key-stats";
import type { TimeRange } from "@/lib/time-range";

interface HeatmapCanvasProps {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

// Keys rest at a translucent black and fade to red as they are missed more.
const REST_COLOR = "rgba(0,0,0,0.5)";
const MISS_COLOR = "rgba(255,0,0,1)";

/** The "Missed keys" map. */
export function HeatmapCanvas({ keyboardName, timeRange }: HeatmapCanvasProps) {
  const keyStats = useKeyStats(keyboardName, timeRange);

  const { colorMap, maxMissed, totalMissed, missedKeys, topKey } = useMemo(() => {
    const maxMissed = max(Array.from(keyStats.values()).map((v) => v.incorrect)) ?? 0;
    const colorScale = scaleSequential()
      .interpolator(interpolateRgb(REST_COLOR, MISS_COLOR))
      .domain([0, maxMissed || 1]);

    const colorMap = new Map<string, string>();
    let totalMissed = 0;
    let missedKeys = 0;
    let topKey: string | null = null;
    keyStats.forEach((value, key) => {
      colorMap.set(key, colorScale(value.incorrect));
      totalMissed += value.incorrect;
      if (value.incorrect > 0) missedKeys += 1;
      if (value.incorrect > 0 && value.incorrect === maxMissed && topKey === null) topKey = key;
    });
    return { colorMap, maxMissed, totalMissed, missedKeys, topKey };
  }, [keyStats]);

  const hasPresses = keyStats.size > 0;

  let summary: string;
  if (!hasPresses) summary = "No typing sessions on this keyboard layout in this range yet.";
  else if (totalMissed === 0) summary = "No missed keys in this range. Nice work.";
  else
    summary = `${totalMissed.toLocaleString()} missed presses across ${missedKeys} ${
      missedKeys === 1 ? "key" : "keys"
    }. Most missed: ${keyLabel(topKey ?? "")}.`;

  return (
    <KeyMapCard
      title="Missed keys"
      subtitle={summary}
      keyboardName={keyboardName}
      colorMap={colorMap}
      legend={
        hasPresses
          ? {
              from: "0 misses",
              to: `${maxMissed.toLocaleString()} ${maxMissed === 1 ? "miss" : "misses"}`,
              gradient: `linear-gradient(to right, ${REST_COLOR}, ${MISS_COLOR})`,
            }
          : null
      }
      renderTooltip={(key) => {
        const stat = keyStats.get(key);
        if (!stat) return <p className="text-slate-400">Not pressed in this range</p>;
        const total = stat.correct + stat.incorrect;
        return (
          <>
            <p>
              Missed: <span className="font-semibold">{stat.incorrect.toLocaleString()}</span>
            </p>
            <p>
              Correct: <span className="font-semibold">{stat.correct.toLocaleString()}</span>
            </p>
            <p>
              Miss rate:{" "}
              <span className="font-semibold">{((stat.incorrect / total) * 100).toFixed(1)}%</span>
            </p>
          </>
        );
      }}
    />
  );
}
