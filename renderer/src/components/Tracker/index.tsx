"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { LetterStat, statsReducer, StatState } from "./reducers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
  faSwords,
  faFlag,
  faCode,
} from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/keyboards/key";
import sample from "lodash.sample";
import { useSettings } from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import { useCode } from "@/lib/code-provider";
import { lookupKeyboard, KeyboardLayoutNames } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { ModalType, useModal } from "@/lib/modal-provider";
import { usePvP } from "@/lib/pvp-provider";
import clsx from "clsx";

export interface KeyPress {
  key: Key;
  ttl: number;
  i: number;
  j: number;
  correct: boolean;
}

export interface CurrentKeyRef {
  current: Key;
  i: number;
  j: number;
}

const initialStat: StatState = {
  correct: 0,
  incorrect: 0,
  time: Temporal.Duration.from({ milliseconds: 0 }),
  start: Temporal.Now.instant(),
  letters: [] as LetterStat[],
  immutableLetters: [] as LetterStat[],
};

function sign(num: number): string {
  if (num > 0) return "+";
  // if (num < 0) return "-"
  return "";
}

export default function Tracker({ mode, rightPanel }: { mode?: "code"; rightPanel?: React.ReactNode }) {
  const settings = useSettings();
  const effectiveCodeMode = mode === "code" || settings.codeMode;
  const { modal } = useModal();
  const router = useRouter();
  const { currentRace, completeRace, forfeitRace } = usePvP();

  const [words, setWords] = useState("");
  const [wordList] = useWords();
  const { currentSnippet, nextSnippet } = useCode();
  const [showChange, setShowChange] = useState(false);

  const { putResult } = useResults();

  const [
    { correct, incorrect, time, letters, immutableLetters },
    statsDispatch,
  ] = useReducer(statsReducer, initialStat);

  // Get the current text based on mode
  const currentText = effectiveCodeMode ? currentSnippet : words;

  const resetWords = useCallback(async () => {
    // PvP mode: word_set is locked at game creation; never re-sample.
    if (currentRace) {
      setWords(currentRace.game.word_set.join(" "));
      return;
    }
    if (effectiveCodeMode) {
      nextSnippet();
    } else {
      const selected: string[] = [];
      for (let i = 0; i < 15; i++) {
        selected.push(sample(wordList)!);
      }
      const pinned = selected.join(" ").replaceAll("  ", "");
      setWords(pinned);
    }
  }, [wordList, currentRace, effectiveCodeMode, nextSnippet]);

  useEffect(() => {
    resetWords();
  }, [resetWords]);

  const keys = useRef<KeyPress[]>([]);
  const [currentKey, setCurrentKey] = useState<CurrentKeyRef>();
  const codeContainerRef = useRef<HTMLPreElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = codeContainerRef.current;
    const cursor = cursorRef.current;
    if (!container || !cursor) return;
    const containerRect = container.getBoundingClientRect();
    const cursorRect = cursor.getBoundingClientRect();
    // Position of cursor midpoint relative to the container's visible top edge
    const cursorMidInView = cursorRect.top - containerRect.top + cursorRect.height / 2;
    const halfContainer = container.clientHeight / 2;
    // Only start scrolling once the cursor passes the midpoint of the visible area
    if (cursorMidInView <= halfContainer) return;
    const targetScrollTop = container.scrollTop + (cursorMidInView - halfContainer);
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  }, [letters.length]);

  useLayoutEffect(() => {
    if (currentText.length === 0) return;
    const currentChar = currentText[letters.length];
    if (!currentChar) return;
    // After a PvP race completes the keyDown handler navigates away, but
    // this effect fires once more before unmount with letters.length ===
    // currentText.length — guard handled above.
    if (currentChar === "\n" || currentChar === "\t") return;
    if (!keyboard.keyExists(currentChar.toLowerCase())) return;
    const key = keyboard.findKey(currentChar.toLowerCase());
    const [i, j] = keyboard.findIndex(currentChar.toLowerCase());
    // Skip the state update when nothing actually changed — avoids an
    // infinite loop caused by the new object reference always being !== prev.
    setCurrentKey((prev) => {
      if (prev?.current === key && prev?.i === i && prev?.j === j) return prev;
      return { current: key, i, j };
    });
  }, [letters.length, currentText]);

  const d = time;
  const total = correct + incorrect;
  const m = d.total("milliseconds") / 1000 / 60;
  const cpm = total / m;
  const p = (correct / total) * 100;

  // PvP mode locks in the game's keyboard at creation time; race-time
  // accuracy must validate against THAT keyboard, not the user's current
  // global setting (the partner might have a different one).
  const activeKeyboardName: KeyboardLayoutNames = currentRace
    ? (currentRace.game.keyboard as KeyboardLayoutNames)
    : settings.keyboardName;
  const keyboardLayout = lookupKeyboard(activeKeyboardName);
  const keyboard = new Keyboard(keyboardLayout);

  const intervalFn = () => {
    if (letters.length > 0) statsDispatch({ type: "TICK" });
  };

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    if (modal !== ModalType.NONE) {
      return;
    }
    e.preventDefault();

    if (e.key === "Shift") return;

    if (e.key === "Backspace") {
      statsDispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key === "Escape") {
      // PvP mode: Escape is a no-op (use the Forfeit button to exit).
      if (currentRace) return;
      if (letters.length === 0) {
        resetWords();
      }
      statsDispatch({ type: "RESET" });
      return;
    }

    const expectedChar = currentText[letters.length];
    if (!expectedChar) return;

    // In code mode, handle special keys
    if (effectiveCodeMode) {
      // Handle Enter key for newlines
      if (e.key === "Enter" && expectedChar === "\n") {
        if (letters.length === 0) {
          statsDispatch({ type: "START" });
          setShowChange(false);
        }
        statsDispatch({ type: "CORRECT", key: "\n" });
        checkCompletion();
        return;
      }

      // Handle Tab key - convert to spaces based on tabWidth
      if (e.key === "Tab") {
        // Check if we're expecting spaces (indentation)
        const tabSpaces = " ".repeat(settings.tabWidth);
        const remainingText = currentText.substring(letters.length);
        
        if (remainingText.startsWith(tabSpaces)) {
          if (letters.length === 0) {
            statsDispatch({ type: "START" });
            setShowChange(false);
          }
          // Type all the spaces that make up the tab
          for (let i = 0; i < settings.tabWidth; i++) {
            statsDispatch({ type: "CORRECT", key: " " });
          }
          checkCompletion(settings.tabWidth);
          return;
        } else if (expectedChar === " ") {
          // Just type a single space
          if (letters.length === 0) {
            statsDispatch({ type: "START" });
            setShowChange(false);
          }
          statsDispatch({ type: "CORRECT", key: " " });
          checkCompletion();
          return;
        }
      }
    }

    // In code mode, accept any printable character (length === 1 filters out
    // non-printable keys like "ArrowLeft", "Control", etc.). Outside code mode,
    // restrict to keys that exist on the selected keyboard layout.
    const isCodeModePrintable = effectiveCodeMode && e.key.length === 1;
    if (!isCodeModePrintable && !keyboard.keyExists(e.key.toLowerCase())) return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
      setShowChange(false);
    }

    // Handle the key press
    let key: Key | null = null;
    let i = 0, j = 0;

    if (keyboard.keyExists(e.key.toLowerCase())) {
      key = keyboard.findKey(e.key.toLowerCase());
      [i, j] = keyboard.findIndex(e.key.toLowerCase());
      if (key.isInert) return;
    }

    if (e.key === expectedChar) {
      statsDispatch({ type: "CORRECT", key: expectedChar });
      if (key) {
        keys.current.push({ key: key, ttl: 255, i, j, correct: true });
        keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
      }
    } else {
      statsDispatch({
        type: "INCORRECT",
        key: expectedChar,
        pressedKey: e.key,
      });
      if (key) {
        keys.current.push({ key: key, ttl: 255, i, j, correct: false });
        keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
      }
    }

    checkCompletion();
  };

  const checkCompletion = (pendingCount = 1) => {
    if (letters.length + pendingCount === currentText.length) {
      setShowChange(true);
      const finalCpm =
        (correct + incorrect) / (time.total("milliseconds") / 1000 / 60);
      const isoTime = time.toString();
      const finalKeyPresses = [...immutableLetters];

      if (currentRace) {
        // PvP mode: route the completed race to the provider, then navigate
        // to the challenge detail page so the user sees the link (creating)
        // or the result comparison (racing).
        completeRace({
          cpm: finalCpm,
          correct,
          incorrect,
          time: isoTime,
          key_presses: finalKeyPresses,
        }).then((completed) => {
          if (completed) {
            router.push(`/pvp/challenge?id=${completed.id}`);
          } else {
            router.push("/pvp");
          }
        });
      } else {
        const results: Result = {
          correct,
          incorrect,
          keyPresses: finalKeyPresses,
          time: isoTime,
          datetime: Temporal.Now.instant().toString(),
          level: settings.levelName,
          keyboard: settings.keyboardName,
          language: settings.language,
          capital: settings.capital,
          punctuation: settings.punctuation,
          numbers: settings.numbers,
          cpm: finalCpm,
          codeMode: effectiveCodeMode,
          codeLang: effectiveCodeMode ? settings.codeLang : undefined,
        };

        putResult(results);
        resetWords();
        statsDispatch({ type: "RESET" });
      }
    }
  };

  const handleForfeit = () => {
    forfeitRace();
    router.push("/pvp");
  };

  const { results } = useResults();
  // get the typo diff between the last two results
  const typoDiff =
    results.length > 1 ? results[0].incorrect - results[1].incorrect : 0;

  let cpmDiff = 0;
  let accuracyDiff = 0;
  if (results.length > 1) {
    cpmDiff = results[0].cpm - results[1].cpm;

    const total0 = results[0].correct + results[0].incorrect;
    const total1 = results[1].correct + results[1].incorrect;
    const acc0 = total0 > 0 ? results[0].correct / total0 : 0;
    const acc1 = total1 > 0 ? results[1].correct / total1 : 0;
    accuracyDiff = acc0 - acc1;
  }

  // PvP banner content
  const pvpBanner = currentRace ? (
    <div
      data-testid="pvp-mode-banner"
      className="flex items-center justify-between gap-4 px-4 py-2 mb-3 mx-auto max-w-[760px] rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-100"
    >
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faSwords} className="w-4 h-4 text-sky-400" />
        <span className="font-semibold text-sm text-sky-300">PvP Battle</span>
        <span className="text-xs text-sky-400/70">playing blind</span>
      </div>
      <button
        data-testid="pvp-forfeit"
        onClick={handleForfeit}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors duration-150"
      >
        <FontAwesomeIcon icon={faFlag} className="w-3 h-3" />
        Forfeit
      </button>
    </div>
  ) : null;

  // Render the text display for non-code (word practice) mode
  const renderTextDisplay = () => (
    <div className="mx-auto min-w-[900px] max-w-[1000px] mt-4 px-8 py-6">
      <p className="font-['Roboto_Mono'] text-center text-base leading-loose tracking-wide whitespace-pre-wrap">
        {letters.map((letter, i) => (
          <span
            key={i}
            className={
              letter.correct
                ? "text-slate-400 dark:text-slate-500"
                : "bg-red-500/20 text-red-400 rounded-sm"
            }
          >
            {letter.key}
          </span>
        ))}
        <span className="bg-amber-400 text-slate-900 font-bold rounded-sm px-px">
          {currentText[letters.length]}
        </span>
        <span className="text-slate-600 dark:text-slate-400">
          {currentText.substring(letters.length + 1)}
        </span>
      </p>
    </div>
  );

  const horizontalStats = (
    <div className="flex justify-center pt-6 font-mono">
      <div className="flex w-[740px] rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.07]">
        {/* Typos */}
        <div className="flex flex-1 items-center justify-center gap-4 py-4 px-6">
          <FontAwesomeIcon
            icon={effectiveCodeMode ? faCode : faDungeon}
            className="text-slate-500 dark:text-slate-500 text-3xl flex-shrink-0"
          />
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {incorrect}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={clsx("text-[13px] font-semibold tabular-nums leading-none", showChange && !currentRace ? typoDiff <= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
              {sign(typoDiff)}{typoDiff}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold leading-none">typos</span>
          </div>
        </div>
        {/* Speed */}
        <div className="flex flex-1 items-center justify-center gap-4 py-4 px-6 border-x border-white/[0.07]">
          <FontAwesomeIcon icon={faPersonRunning} className="text-slate-500 dark:text-slate-500 text-3xl flex-shrink-0" />
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={clsx("text-[13px] font-semibold tabular-nums leading-none", showChange && !currentRace ? cpmDiff >= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
              {sign(cpmDiff)}{Number.isFinite(cpmDiff) ? cpmDiff.toFixed(0) : "0"}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold leading-none">char/min</span>
          </div>
        </div>
        {/* Accuracy */}
        <div className="flex flex-1 items-center justify-center gap-4 py-4 px-6">
          <FontAwesomeIcon icon={faPercentage} className="text-slate-500 dark:text-slate-500 text-3xl flex-shrink-0" />
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {Number.isFinite(p) ? p.toFixed(0) : 0}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={clsx("text-[13px] font-semibold tabular-nums leading-none", showChange && !currentRace ? accuracyDiff >= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
              {sign(accuracyDiff)}{Number.isFinite(accuracyDiff) ? (accuracyDiff * 100).toFixed(1) : "0.0"}%
            </span>
            <span className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold leading-none">accuracy</span>
          </div>
        </div>
      </div>
    </div>
  );

  const verticalStats = (
    <div className="flex flex-col gap-2 w-20 flex-shrink-0 font-mono">
      {/* Typos */}
      <div className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
        <FontAwesomeIcon icon={faCode} className="text-slate-500 text-base" />
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{incorrect}</span>
        <span className="text-[8px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold">typos</span>
        <span className={clsx("text-[10px] font-semibold tabular-nums", showChange && !currentRace ? typoDiff <= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
          {sign(typoDiff)}{typoDiff}
        </span>
      </div>
      {/* Speed */}
      <div className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
        <FontAwesomeIcon icon={faPersonRunning} className="text-slate-500 text-base" />
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{Number.isFinite(cpm) ? cpm.toFixed(0) : 0}</span>
        <span className="text-[8px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold">chr/min</span>
        <span className={clsx("text-[10px] font-semibold tabular-nums", showChange && !currentRace ? cpmDiff >= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
          {sign(cpmDiff)}{Number.isFinite(cpmDiff) ? cpmDiff.toFixed(0) : "0"}
        </span>
      </div>
      {/* Accuracy */}
      <div className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.07]">
        <FontAwesomeIcon icon={faPercentage} className="text-slate-500 text-base" />
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{Number.isFinite(p) ? p.toFixed(0) : 0}</span>
        <span className="text-[8px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold">accur.</span>
        <span className={clsx("text-[10px] font-semibold tabular-nums", showChange && !currentRace ? accuracyDiff >= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
          {sign(accuracyDiff)}{Number.isFinite(accuracyDiff) ? (accuracyDiff * 100).toFixed(0) : "0"}%
        </span>
      </div>
    </div>
  );

  const codeBox = (
    <div className="flex flex-col flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.07] shadow-sm">
      {/* Editor chrome bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/50" />
          <div className="w-3 h-3 rounded-full bg-amber-400/50" />
          <div className="w-3 h-3 rounded-full bg-green-400/50" />
        </div>
        <span className="text-[11px] font-mono font-medium tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          {settings.codeLang}
        </span>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-600">
          tab = indent · enter = newline
        </span>
      </div>
      {/* Wrapper takes flex-1 height but contributes 0 natural height (child is absolute) */}
      <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-950/60">
        <pre ref={codeContainerRef} className="absolute inset-0 font-['Roboto_Mono'] text-sm text-left p-5 whitespace-pre overflow-x-auto overflow-y-auto leading-relaxed scrollbar-none">
          <code>
            {currentText.split("").map((char, i) => {
              const isTyped = i < letters.length;
              const isCorrect = isTyped ? letters[i]?.correct : false;
              const isCurrent = i === letters.length;

              if (char === "\n") {
                return (
                  <span
                    key={i}
                    ref={isCurrent ? cursorRef : undefined}
                    className={clsx(
                      isTyped
                        ? isCorrect
                          ? "text-slate-400 dark:text-slate-600"
                          : "bg-red-500/20 text-red-400"
                        : isCurrent
                        ? "bg-amber-400/30 text-amber-600 dark:text-amber-400"
                        : "text-slate-300 dark:text-slate-700",
                    )}
                  >
                    {isCurrent ? "↵" : ""}
                    {"\n"}
                  </span>
                );
              }

              if (char === " " && isCurrent) {
                return (
                  <span key={i} ref={cursorRef} className="bg-amber-400 text-slate-900 font-bold rounded-sm">
                    {"·"}
                  </span>
                );
              }

              return (
                <span
                  key={i}
                  ref={isCurrent ? cursorRef : undefined}
                  className={clsx(
                    isTyped
                      ? isCorrect
                        ? "text-slate-500 dark:text-slate-400"
                        : "bg-red-500/20 text-red-400 rounded-sm"
                      : isCurrent
                      ? "bg-amber-400 text-slate-900 font-bold rounded-sm"
                      : "text-slate-800 dark:text-slate-200",
                  )}
                >
                  {char}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );

  return (
    <div
      className={clsx(
        currentRace && "ring-2 ring-sky-500/40 ring-offset-0 rounded-xl pb-2",
      )}
    >
      {pvpBanner}

      {effectiveCodeMode && !currentRace ? (
        /* 3-column layout: stats | code box | controls — width-capped to keyboard visual bounds */
        <div className="flex items-stretch gap-3 max-w-5xl mx-auto px-4 pt-4">
          {verticalStats}
          <div className="flex-1 min-w-0 flex flex-col">{codeBox}</div>
          {rightPanel && (
            <div className="flex-shrink-0 w-28">{rightPanel}</div>
          )}
        </div>
      ) : (
        <>
          {horizontalStats}
          {renderTextDisplay()}
        </>
      )}

      <Canvas
        letters={letters}
        currentKey={currentKey}
        keyDown={keyDown}
        keys={keys}
        intervalFn={intervalFn}
        keyboardName={activeKeyboardName}
      />
    </div>
  );
}
