"use client";

import { KeyboardLayoutNames } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { Levels } from "@/lib/settings_hook";
import { Duration } from "luxon";
import { useEffect, useLayoutEffect, useState } from "react";
import { faStar, faStarHalf } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";

interface BestForEachLevelProps {
  keyboard: KeyboardLayoutNames;
}

const initialState = [
  {
    level: Levels.LEVEL_1,
    cpm: 0,
    incorrect: 0,
    time: Duration.fromISO("PT0S"),
  },
  {
    level: Levels.LEVEL_2,
    cpm: 0,
    incorrect: 0,
    time: Duration.fromISO("PT0S"),
  },
  {
    level: Levels.LEVEL_3,
    cpm: 0,
    incorrect: 0,
    time: Duration.fromISO("PT0S"),
  },
  {
    level: Levels.LEVEL_4,
    cpm: 0,
    incorrect: 0,
    time: Duration.fromISO("PT0S"),
  },
  {
    level: Levels.LEVEL_5,
    cpm: 0,
    incorrect: 0,
    time: Duration.fromISO("PT0S"),
  },
  {
    level: Levels.LEVEL_6,
    cpm: 0,
    incorrect: 0,
    time: Duration.fromISO("PT0S"),
  },
];

function calcStars(cpm: number, incorrect: number, time: Duration) {
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
            time: Duration.fromISO(result.time),
          };
        }
        return b;
      });
    });

    return () => {
        setBestLevel(initialState);
    }

    // console.log(bestForEachLevel);
  }, [results, keyboard]);

  return (
    <div className="flex gap-4 mx-auto max-w-7xl justify-center grid-cols-6">
      {bestLevel.map((b) => {
        const score = calcStars(b.cpm, b.incorrect, b.time);
        return (
          <div
            key={b.level}
            className={clsx(
              b.cpm > 0 ? "" : "brightness-50",
              score === 5 ? "bg-yellow-300" : "",
              "bg-slate-50 px-4 py-3 rounded-2xl text-black drop-shadow-lg min-w-44 min-h-[104px]",
            )}
          >
            <div className="flex justify-between items-center gap-2">
              <h2 className="text-lg font-semibold">Level {b.level}</h2>
              {b.time.toMillis() > 0 && <span className="text-xs">{b.time.toFormat("mm:ss")}</span>}
            </div>
            <div className="text-xs py-1">
              {b.cpm > 0 && (
                <div className="flex gap-3">
                  <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                    {b.cpm.toFixed(0)}cpm
                  </span>
                  <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    {b.incorrect} errors
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-center pt-1">
              {Array.from(
                { length: score },
                (_, i) => (
                  <FontAwesomeIcon
                    className="text-yellow-500"
                    icon={faStar}
                    key={i}
                  />
                ),
              )}
              {score % 1 === 0.5 && (
                <FontAwesomeIcon icon={faStarHalf} className="text-yellow-500" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
