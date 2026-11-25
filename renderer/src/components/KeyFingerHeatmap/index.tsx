"use client";

import { useMemo } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import KeyMapCard from "@/components/KeyMapCard";
import { useKeyStats } from "@/lib/key-stats";
import {
  FINGER_COLORS,
  FINGER_ORDER,
  fingerMap,
  handOf,
  type Finger,
} from "@/lib/fingers";
import type { TimeRange } from "@/lib/time-range";

interface Props {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

const pct = (n: number, total: number) => (total === 0 ? 0 : (n / total) * 100);

/** Premium: which finger types each key, and how the work is shared between them. */
export default function KeyFingerHeatmap({ keyboardName, timeRange }: Props) {
  const keyStats = useKeyStats(keyboardName, timeRange);
  const fingers = useMemo(() => fingerMap(keyboardName), [keyboardName]);

  const { colorMap, byFinger, byHand, total } = useMemo(() => {
    const colorMap = new Map<string, string>();
    const byFinger = new Map<Finger, number>();
    const byHand = { left: 0, right: 0, thumb: 0 };
    let total = 0;

    // Every key on the layout gets its finger colour, pressed or not, so the map
    // reads as a typing guide even before there is data.
    fingers.forEach((finger, key) => colorMap.set(key, FINGER_COLORS[finger]));

    keyStats.forEach((stat, key) => {
      const finger = fingers.get(key.toLowerCase());
      if (!finger) return;
      const n = stat.correct + stat.incorrect;
      byFinger.set(finger, (byFinger.get(finger) ?? 0) + n);
      byHand[handOf(finger)] += n;
      total += n;
    });
    return { colorMap, byFinger, byHand, total };
  }, [fingers, keyStats]);

  return (
    <KeyMapCard
      title="Fingers"
      subtitle={
        total > 0
          ? `Left hand ${pct(byHand.left, total).toFixed(0)}%, right hand ${pct(byHand.right, total).toFixed(0)}%, thumbs ${pct(byHand.thumb, total).toFixed(0)}% of your presses. Hover a key for its finger's share.`
          : "Which finger types each key. Cool colours are your left hand, warm ones your right."
      }
      keyboardName={keyboardName}
      colorMap={colorMap}
      legendContent={
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
          {FINGER_ORDER.map((finger) => (
            <span key={finger} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: FINGER_COLORS[finger] }}
              />
              {finger}
              {total > 0 && (
                <span className="text-fg-subtle">{pct(byFinger.get(finger) ?? 0, total).toFixed(0)}%</span>
              )}
            </span>
          ))}
        </div>
      }
      renderTooltip={(key) => {
        const finger = fingers.get(key.toLowerCase());
        if (!finger) return <p className="text-slate-400">Not part of the typing block</p>;
        const n = byFinger.get(finger) ?? 0;
        return (
          <>
            <p>
              Finger: <span className="font-semibold">{finger}</span>
            </p>
            <p>
              This finger: <span className="font-semibold">{pct(n, total).toFixed(1)}%</span>{" "}
              <span className="text-slate-400">of presses</span>
            </p>
          </>
        );
      }}
    />
  );
}
