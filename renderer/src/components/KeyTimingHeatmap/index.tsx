"use client";

import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import KeyMapCard from "@/components/KeyMapCard";
import { useStatsQuery } from "@/components/Charts/useStatsQuery";
import { getKeyTiming, type KeyTimingRow } from "@/transactions/statsCharts";

interface Props {
  /** Window in days; null means all time. */
  days: number | null;
  keyboardName: KeyboardLayoutNames;
}

const FAST = [59, 130, 246];
const SLOW = [239, 68, 68];

/** Blue for the quickest key, red for the slowest, pushed further red by errors. */
function buildColors(rows: KeyTimingRow[]) {
  const colorMap = new Map<string, string>();
  const byKey = new Map<string, KeyTimingRow>();
  if (rows.length === 0) return { colorMap, byKey };

  const times = rows.map((r) => r.avg_ms);
  const min = Math.min(...times);
  const range = Math.max(...times) - min || 1;

  for (const row of rows) {
    const t = (row.avg_ms - min) / range;
    const r = FAST[0] + t * (SLOW[0] - FAST[0]);
    const g = FAST[1] + t * (SLOW[1] - FAST[1]);
    const b = FAST[2] + t * (SLOW[2] - FAST[2]);
    const withErrors = r + row.error_rate * (SLOW[0] - r);
    colorMap.set(row.key, `rgb(${Math.round(withErrors)},${Math.round(g)},${Math.round(b)})`);
    byKey.set(row.key, row);
  }
  return { colorMap, byKey };
}

/** The premium "Key timing heatmap". The database refuses the query for non-premium users. */
export default function KeyTimingHeatmap({ days, keyboardName }: Props) {
  const state = useStatsQuery(() => getKeyTiming(days, keyboardName), [days, keyboardName]);

  const { colorMap, byKey } = useMemo(
    () => buildColors(state.status === "ready" ? state.data : []),
    [state],
  );

  let message: string | null = null;
  if (state.status === "loading") message = "Loading…";
  else if (state.status === "locked") message = "Premium is required for this map.";
  else if (state.status === "error") message = state.message;
  else if (state.data.length === 0) message = "No typing data for this layout in this period yet.";

  return (
    <KeyMapCard
      title="Key timing heatmap"
      subtitle="How long each key takes you to reach. Blue is quick, red is slow, and misses push a key redder."
      keyboardName={keyboardName}
      colorMap={colorMap}
      message={message}
      legend={{
        from: "Fast",
        to: "Slow",
        gradient: `linear-gradient(to right, rgb(${FAST.join(",")}), rgb(${SLOW.join(",")}))`,
      }}
      renderTooltip={(key) => {
        const row = byKey.get(key);
        if (!row) return <p className="text-slate-400">Not pressed in this range</p>;
        return (
          <>
            <p>
              Avg timing: <span className="font-semibold">{Math.round(row.avg_ms)}ms</span>
            </p>
            <p>
              Error rate: <span className="font-semibold">{(row.error_rate * 100).toFixed(1)}%</span>
            </p>
            <p>
              Total presses: <span className="font-semibold">{row.presses.toLocaleString()}</span>
            </p>
          </>
        );
      }}
    />
  );
}
