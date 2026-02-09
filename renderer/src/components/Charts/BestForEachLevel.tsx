"use client";

import { KEYBOARD_OPTIONS } from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { Levels } from "@/lib/settings_hook";
import { Duration } from "luxon";
import { useMemo } from "react";
import { faStar, faStarHalf } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";

interface BestForEachLevelProps {
  keyboard?: KeyboardLayoutNames;
  keyboards?: KeyboardLayoutNames[];
}

const initialState = [
  { level: Levels.LEVEL_1, cpm: 0, incorrect: 0, time: Duration.fromISO("PT0S") },
  { level: Levels.LEVEL_2, cpm: 0, incorrect: 0, time: Duration.fromISO("PT0S") },
  { level: Levels.LEVEL_3, cpm: 0, incorrect: 0, time: Duration.fromISO("PT0S") },
  { level: Levels.LEVEL_4, cpm: 0, incorrect: 0, time: Duration.fromISO("PT0S") },
  { level: Levels.LEVEL_5, cpm: 0, incorrect: 0, time: Duration.fromISO("PT0S") },
  { level: Levels.LEVEL_6, cpm: 0, incorrect: 0, time: Duration.fromISO("PT0S") },
];

function calcStars(cpm: number, incorrect: number, _time: Duration) {
  const errors = incorrect * -0.5;
  const cpmStars = Math.floor(cpm / 40);
  return Math.min(errors + cpmStars, 5);
}

function getBestForKeyboard(results: Result[], keyboard: KeyboardLayoutNames) {
  const filtered = results.filter((r) => r.keyboard === keyboard);
  const bestForEachLevel = filtered.reduce((acc, curr) => {
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

  return initialState.map((b) => {
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
}

function keyboardDisplayInfo(layout: KeyboardLayoutNames): { name: string; country: string } {
  const opt = KEYBOARD_OPTIONS.find((k) => k.layout === layout);
  return { name: opt?.name ?? String(layout), country: opt?.country ?? "" };
}

function SingleKeyboardSection({
  keyboard,
  bestLevel,
}: {
  keyboard: KeyboardLayoutNames;
  bestLevel: ReturnType<typeof getBestForKeyboard>;
}) {
  const { name, country } = keyboardDisplayInfo(keyboard);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100 pl-10 py-2">
        {country && <span className="text-xl leading-none" aria-hidden="true">{country}</span>}
        <span>{name}</span>
      </h3>
      <div className="flex gap-4 flex-wrap justify-center">
        {bestLevel.map((b) => {
          const score = calcStars(b.cpm, b.incorrect, b.time);
          return (
            <div
              key={b.level}
              className={clsx(
                b.cpm > 0 ? "" : "brightness-50",
                score === 5 ? "bg-yellow-300 dark:bg-yellow-500/30" : "",
                "bg-slate-50 dark:bg-slate-800 px-5 py-4 rounded-2xl text-black dark:text-gray-100 drop-shadow-lg min-w-44 min-h-[104px]"
              )}
            >
              <div className="flex justify-between items-center gap-2 px-0.5 pt-0.5">
                <h2 className="text-lg font-semibold">Level {b.level}</h2>
                {b.time.toMillis() > 0 && (
                  <span className="text-xs tabular-nums">{b.time.toFormat("mm:ss")}</span>
                )}
              </div>
              <div className="text-xs py-2 px-0.5">
                {b.cpm > 0 && (
                  <div className="flex gap-3 justify-between">
                    <span className="inline-flex items-center rounded-md bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {b.cpm.toFixed(0)}cpm
                    </span>
                    <span className="inline-flex items-center rounded-md bg-red-100 dark:bg-red-900/50 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300">
                      {b.incorrect} errors
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-center pt-2 px-0.5 pb-0.5">
                {Array.from({ length: score }, (_, i) => (
                  <FontAwesomeIcon
                    className="text-yellow-500"
                    icon={faStar}
                    key={i}
                  />
                ))}
                {score % 1 === 0.5 && (
                  <FontAwesomeIcon icon={faStarHalf} className="text-yellow-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BestForEachLevel(props: BestForEachLevelProps) {
  const { results } = useResults();
  const keyboards: KeyboardLayoutNames[] = props.keyboards
    ? props.keyboards.length > 0
      ? props.keyboards
      : props.keyboard
        ? [props.keyboard]
        : [KeyboardLayoutNames.MACOS_US_QWERTY]
    : props.keyboard
      ? [props.keyboard]
      : [KeyboardLayoutNames.MACOS_US_QWERTY];

  const perKeyboard = useMemo(
    () =>
      keyboards.map((keyboard) => ({
        keyboard,
        bestLevel: getBestForKeyboard(results, keyboard),
      })),
    [results, keyboards.join(",")]
  );

  if (keyboards.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500 dark:text-gray-400">
        Select one or more keyboard layouts above to see best results per level.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 mx-auto max-w-7xl px-2 sm:px-4">
      {perKeyboard.map(({ keyboard, bestLevel }) => (
        <SingleKeyboardSection key={keyboard} keyboard={keyboard} bestLevel={bestLevel} />
      ))}
    </div>
  );
}
