"use client";

import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import { interpolateRgb } from "d3";
import KeyMapCard from "@/components/KeyMapCard";
import { useKeyImprovement } from "@/lib/key-timing";
import type { TimeRange } from "@/lib/time-range";

interface Props {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

const REST = "rgba(0,0,0,0.5)";
const FASTER = "rgb(34,197,94)";
const SLOWER = "rgb(239,68,68)";
// A key 40% faster or slower than before is as green or red as the map gets.
const FULL_SCALE = 0.4;

const toFaster = interpolateRgb(REST, FASTER);
const toSlower = interpolateRgb(REST, SLOWER);

/** Premium: each key's average time now against the period just before. */
export default function KeyImprovementHeatmap({ keyboardName, timeRange }: Props) {
  const { supported, days, changes } = useKeyImprovement(keyboardName, timeRange);

  const { colorMap, faster, slower } = useMemo(() => {
    const colorMap = new Map<string, string>();
    let faster = 0;
    let slower = 0;
    changes.forEach((c, key) => {
      const t = Math.max(-1, Math.min(1, c.change / FULL_SCALE));
      colorMap.set(key, t < 0 ? toFaster(-t) : toSlower(t));
      if (c.change < 0) faster += 1;
      else if (c.change > 0) slower += 1;
    });
    return { colorMap, faster, slower };
  }, [changes]);

  let message: string | null = null;
  if (!supported) message = "Choose 7, 30 or 90 days to compare against the period before.";
  else if (changes.size === 0)
    message = "Not enough timing data in both periods yet. Each letter needs a few timed presses in each.";

  return (
    <KeyMapCard
      title="Improvement"
      subtitle={
        message
          ? `Each key's average time against the ${days ?? ""} days before it. Green is faster, red is slower.`
          : `${faster} ${faster === 1 ? "key" : "keys"} faster and ${slower} slower than the previous ${days} days.`
      }
      keyboardName={keyboardName}
      colorMap={colorMap}
      message={message}
      legend={{
        from: "Faster",
        to: "Slower",
        gradient: `linear-gradient(to right, ${FASTER}, ${REST}, ${SLOWER})`,
      }}
      renderTooltip={(key) => {
        const c = changes.get(key);
        if (!c) return <p className="text-slate-400">Not enough data in both periods</p>;
        const pct = Math.abs(c.change * 100).toFixed(0);
        return (
          <>
            <p>
              Avg timing: <span className="font-semibold">{Math.round(c.current.avgMs)}ms</span>{" "}
              <span className="text-slate-400">(was {Math.round(c.previous.avgMs)}ms)</span>
            </p>
            <p>
              <span className="font-semibold">
                {c.change < 0 ? `${pct}% faster` : c.change > 0 ? `${pct}% slower` : "No change"}
              </span>
            </p>
            <p>
              Miss rate: <span className="font-semibold">{(c.current.missRate * 100).toFixed(1)}%</span>{" "}
              <span className="text-slate-400">(was {(c.previous.missRate * 100).toFixed(1)}%)</span>
            </p>
          </>
        );
      }}
    />
  );
}
