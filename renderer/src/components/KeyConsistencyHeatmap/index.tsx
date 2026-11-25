"use client";

import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import { interpolateRgb } from "d3";
import KeyMapCard from "@/components/KeyMapCard";
import { keyLabel } from "@/lib/key-stats";
import { useKeyTimings } from "@/lib/key-timing";
import type { TimeRange } from "@/lib/time-range";

interface Props {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

const STEADY = "rgb(14,165,233)";
const ERRATIC = "rgb(217,70,239)";

/** Premium: how much each key's timing varies from press to press, relative to its average. */
export default function KeyConsistencyHeatmap({ keyboardName, timeRange }: Props) {
  const timings = useKeyTimings(keyboardName, timeRange);

  const { colorMap, steadiest, mostErratic } = useMemo(() => {
    const colorMap = new Map<string, string>();
    const all = Array.from(timings.values());
    if (all.length === 0) return { colorMap, steadiest: null, mostErratic: null };

    const lo = Math.min(...all.map((t) => t.variation));
    const hi = Math.max(...all.map((t) => t.variation));
    const span = hi - lo || 1;
    const scale = interpolateRgb(STEADY, ERRATIC);
    for (const t of all) colorMap.set(t.key, scale((t.variation - lo) / span));

    const sorted = [...all].sort((a, b) => a.variation - b.variation);
    return { colorMap, steadiest: sorted[0].key, mostErratic: sorted[sorted.length - 1].key };
  }, [timings]);

  const message =
    timings.size === 0
      ? "Not enough timing data for this layout in this period yet."
      : null;

  return (
    <KeyMapCard
      title="Consistency"
      subtitle={
        steadiest && mostErratic
          ? `How much each key's timing varies from press to press. Steadiest: ${keyLabel(steadiest)}. Most erratic: ${keyLabel(mostErratic)}.`
          : "How much each key's timing varies from press to press, relative to how long it takes."
      }
      keyboardName={keyboardName}
      colorMap={colorMap}
      message={message}
      legend={{
        from: "Steady",
        to: "Erratic",
        gradient: `linear-gradient(to right, ${STEADY}, ${ERRATIC})`,
      }}
      renderTooltip={(key) => {
        const t = timings.get(key);
        if (!t) return <p className="text-slate-400">Not enough data for this key</p>;
        return (
          <>
            <p>
              Avg timing: <span className="font-semibold">{Math.round(t.avgMs)}ms</span>
            </p>
            <p>
              Spread: <span className="font-semibold">±{Math.round(t.stdMs)}ms</span>
            </p>
            <p>
              Variation: <span className="font-semibold">{(t.variation * 100).toFixed(0)}%</span>{" "}
              <span className="text-slate-400">of average</span>
            </p>
          </>
        );
      }}
    />
  );
}
