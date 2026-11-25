"use client";

import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import { interpolateRgb } from "d3";
import KeyMapCard from "@/components/KeyMapCard";
import { keyLabel, useRangeResults } from "@/lib/key-stats";
import type { TimeRange } from "@/lib/time-range";

interface Props {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

const REST = "rgba(0,0,0,0.5)";
const MOST = "rgb(245,158,11)";

interface Confusion {
  misses: number;
  /** What you hit when this key was wanted. */
  typedInstead: Map<string, number>;
  /** What you were after when you hit this key by mistake. */
  mistakenFor: Map<string, number>;
}

/** A key as a single character. Modifiers and other named keys are not mix-ups. */
function normalise(key: string | undefined): string | null {
  if (!key) return null;
  return key.length === 1 ? key.toLowerCase() : null;
}

const top = (counts: Map<string, number>, n = 3) =>
  Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);

const Counts = ({ label, rows }: { label: string; rows: [string, number][] }) =>
  rows.length === 0 ? null : (
    <p>
      {label}{" "}
      {rows.map(([k, n], i) => (
        <span key={k}>
          {i > 0 && ", "}
          <span className="font-semibold">{keyLabel(k)}</span>{" "}
          <span className="text-slate-400">×{n}</span>
        </span>
      ))}
    </p>
  );

/** Premium: which keys you hit when you meant another. */
export default function KeyConfusionHeatmap({ keyboardName, timeRange }: Props) {
  const results = useRangeResults(keyboardName, timeRange);

  const { byKey, colorMap, worst, total } = useMemo(() => {
    const byKey = new Map<string, Confusion>();
    const entry = (key: string) => {
      let c = byKey.get(key);
      if (!c) {
        c = { misses: 0, typedInstead: new Map(), mistakenFor: new Map() };
        byKey.set(key, c);
      }
      return c;
    };
    const pairs = new Map<string, number>();
    let total = 0;

    for (const result of results) {
      for (const press of result.keyPresses ?? []) {
        if (press.correct) continue;
        const wanted = normalise(press.key);
        const hit = normalise(press.pressedKey);
        if (!wanted || !hit || wanted === hit) continue;

        const w = entry(wanted);
        w.misses += 1;
        w.typedInstead.set(hit, (w.typedInstead.get(hit) ?? 0) + 1);
        const h = entry(hit);
        h.mistakenFor.set(wanted, (h.mistakenFor.get(wanted) ?? 0) + 1);

        const pair = `${wanted}${hit}`;
        pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
        total += 1;
      }
    }

    const maxMisses = Math.max(0, ...Array.from(byKey.values()).map((c) => c.misses));
    const scale = interpolateRgb(REST, MOST);
    const colorMap = new Map<string, string>();
    byKey.forEach((c, key) => {
      if (c.misses > 0) colorMap.set(key, scale(c.misses / maxMisses));
    });

    const [worstPair, worstCount] = Array.from(pairs.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
    return {
      byKey,
      colorMap,
      total,
      worst: worstPair ? { wanted: worstPair[0], hit: worstPair[1], count: worstCount } : null,
    };
  }, [results]);

  const message =
    total === 0
      ? results.length === 0
        ? "No typing sessions on this keyboard layout in this period yet."
        : "No mix-ups recorded in this period. Older sessions did not record which key you hit."
      : null;

  return (
    <KeyMapCard
      title="Confusions"
      subtitle={
        worst
          ? `${total.toLocaleString()} mix-ups. Most common: wanted ${keyLabel(worst.wanted)}, hit ${keyLabel(worst.hit)} (${worst.count} times).`
          : "Which key you hit when you meant another. Hover a key to see what it gets confused with."
      }
      keyboardName={keyboardName}
      colorMap={colorMap}
      message={message}
      legend={{ from: "Fewer mix-ups", to: "More mix-ups", gradient: `linear-gradient(to right, ${REST}, ${MOST})` }}
      renderTooltip={(key) => {
        const c = byKey.get(key);
        if (!c) return <p className="text-slate-400">No mix-ups for this key</p>;
        return (
          <>
            {c.misses > 0 && (
              <p>
                Missed: <span className="font-semibold">{c.misses.toLocaleString()}</span>
              </p>
            )}
            <Counts label="Hit instead:" rows={top(c.typedInstead)} />
            <Counts label="Hit by mistake for:" rows={top(c.mistakenFor)} />
          </>
        );
      }}
    />
  );
}
