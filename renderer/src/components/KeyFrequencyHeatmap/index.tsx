"use client";

import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import { interpolateRgb, max, scaleSequentialSqrt } from "d3";
import KeyMapCard from "@/components/KeyMapCard";
import { keyLabel, useKeyStats } from "@/lib/key-stats";
import type { TimeRange } from "@/lib/time-range";

interface Props {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

const REST_COLOR = "rgba(0,0,0,0.5)";
const MOST_COLOR = "rgb(16,185,129)";

/** The "Keys pressed" map: how often each key is hit, regardless of accuracy. */
export default function KeyFrequencyHeatmap({ keyboardName, timeRange }: Props) {
  const keyStats = useKeyStats(keyboardName, timeRange);

  const { colorMap, counts, total, maxPresses, topKey } = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    keyStats.forEach((v, key) => {
      const n = v.correct + v.incorrect;
      counts.set(key, n);
      total += n;
    });
    const maxPresses = max(Array.from(counts.values())) ?? 0;

    // Square-root scale: the space bar is hit far more than any letter and
    // would otherwise wash every other key out to the resting colour.
    const colorScale = scaleSequentialSqrt()
      .interpolator(interpolateRgb(REST_COLOR, MOST_COLOR))
      .domain([0, maxPresses || 1]);

    const colorMap = new Map<string, string>();
    let topKey: string | null = null;
    counts.forEach((n, key) => {
      colorMap.set(key, colorScale(n));
      if (n === maxPresses && topKey === null) topKey = key;
    });
    return { colorMap, counts, total, maxPresses, topKey };
  }, [keyStats]);

  const hasPresses = total > 0;

  return (
    <KeyMapCard
      title="Keys pressed"
      subtitle={
        hasPresses
          ? `${total.toLocaleString()} key presses. Most pressed: ${keyLabel(topKey ?? "")}. Colour is on a square-root scale so common keys don't hide the rest.`
          : "No typing sessions on this keyboard layout in this range yet."
      }
      keyboardName={keyboardName}
      colorMap={colorMap}
      legend={
        hasPresses
          ? {
              from: "Fewer presses",
              to: "More presses",
              gradient: `linear-gradient(to right, ${REST_COLOR}, ${MOST_COLOR})`,
            }
          : null
      }
      renderTooltip={(key) => {
        const n = counts.get(key);
        if (!n) return <p className="text-slate-400">Not pressed in this range</p>;
        return (
          <>
            <p>
              Pressed: <span className="font-semibold">{n.toLocaleString()}</span>
            </p>
            <p>
              Frequency:{" "}
              <span className="font-semibold">{((n / total) * 100).toFixed(1)}%</span>
            </p>
            {n === maxPresses && <p className="text-slate-400">Your most pressed key</p>}
          </>
        );
      }}
    />
  );
}
