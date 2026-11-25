"use client";

import { KeyboardLayoutNames } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { Levels } from "@/lib/settings_hook";
import { formatDuration, parseDuration, ZERO_DURATION } from "@/lib/duration";
import { useEffect, useLayoutEffect, useState } from "react";
import { faStar, faStarHalf } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { colorForLevel } from "@/lib/level-colors";

interface BestForEachLevelProps {
  keyboard: KeyboardLayoutNames;
}

const initialState = [
  {
    level: Levels.LEVEL_1,
    cpm: 0,
    incorrect: 0,
    time: ZERO_DURATION,
  },
  {
    level: Levels.LEVEL_2,
    cpm: 0,
    incorrect: 0,
    time: ZERO_DURATION,
  },
  {
    level: Levels.LEVEL_3,
    cpm: 0,
    incorrect: 0,
    time: ZERO_DURATION,
  },
  {
    level: Levels.LEVEL_4,
    cpm: 0,
    incorrect: 0,
    time: ZERO_DURATION,
  },
  {
    level: Levels.LEVEL_5,
    cpm: 0,
    incorrect: 0,
    time: ZERO_DURATION,
  },
  {
    level: Levels.LEVEL_6,
    cpm: 0,
    incorrect: 0,
    time: ZERO_DURATION,
  },
];

function calcStars(cpm: number, incorrect: number, time: Temporal.Duration) {
  // -1/2 star for each error
  // 1 star for each 70 cpm

  const errors = incorrect * -0.5;
  const cpmStars = Math.floor(cpm / 40);
  return Math.min(errors + cpmStars, 5);
}

export default function BestForEachLevel({ keyboard }: BestForEachLevelProps) {
  const { results } = useResults();
  const [bestLevel, setBestLevel] = useState(initialState);

  useLayoutEffect(() => {
    const filterd = results.filter((r) => r.keyboard === keyboard);

    // for each level, get the best result. The best result is the one with the lowest incorrect and then the highest cpm

    const bestForEachLevel = filterd.reduce((acc, curr) => {
      const key = curr.level;
      if (!acc.has(key)) {
        acc.set(key, curr);
      } else {
        if (curr.incorrect < acc.get(key)!.incorrect) {
          acc.set(key, curr);
        } else if (curr.incorrect === acc.get(key)!.incorrect) {
          if (curr.cpm > acc.get(key)!.cpm) {
            acc.set(key, curr);
          }
        }
      }
      return acc;
    }, new Map<Levels, Result>());

    setBestLevel((prev) => {
      return prev.map((b) => {
        const result = bestForEachLevel.get(b.level);
        if (result) {
          return {
            level: result.level,
            cpm: result.cpm,
            incorrect: result.incorrect,
            time: parseDuration(result.time),
          };
        }
        return b;
      });
    });

    return () => {
        setBestLevel(initialState);
    }
  }, [results, keyboard]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {bestLevel.map((b) => {
        const score = calcStars(b.cpm, b.incorrect, b.time);
        const played = b.cpm > 0;
        const perfect = score === 5;
        const fullStars = Math.max(0, Math.floor(score));
        const halfStar = score > 0 && score % 1 === 0.5;
        return (
          <div
            key={b.level}
            className={clsx(
              "flex min-h-[104px] flex-col gap-3 rounded-2xl border p-4",
              perfect
                ? "bg-amber-400/10 border-amber-400/30"
                : "bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06]",
              !played && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: colorForLevel(b.level) }}
                />
                Level {b.level}
              </h2>
              {b.time.total("milliseconds") > 0 && (
                <span className="text-xs tabular-nums text-slate-500">
                  {formatDuration(b.time, "mm:ss")}
                </span>
              )}
            </div>

            {played ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200"
                    style={{
                      backgroundColor: `${colorForLevel(b.level)}26`,
                      borderColor: `${colorForLevel(b.level)}59`,
                    }}
                  >
                    {b.cpm.toFixed(0)} cpm
                  </span>
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      b.incorrect === 0
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
                        : "bg-red-400/10 text-red-600 dark:text-red-300",
                    )}
                  >
                    {b.incorrect} {b.incorrect === 1 ? "error" : "errors"}
                  </span>
                </div>
                <div className="flex gap-0.5 text-xs" aria-label={`${score} of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <FontAwesomeIcon
                      key={i}
                      icon={i < fullStars ? faStar : i === fullStars && halfStar ? faStarHalf : faStar}
                      className={
                        i < fullStars || (i === fullStars && halfStar)
                          ? "text-amber-400"
                          : "text-slate-300 dark:text-white/10"
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">Not played yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
