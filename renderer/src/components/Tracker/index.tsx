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
import { durationToMinutes, durationToSeconds, ZERO_DURATION } from "@/lib/duration";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
  faSwords,
  faFlag,
  faCode,
  faClock,
  faCircleCheck,
  faBullseye,
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
import confetti from "canvas-confetti";

function netCpmOf(r: Result): number {
  const minutes = durationToMinutes(r.time);
  return minutes > 0 ? r.correct / minutes : 0;
}

function totalSecondsOf(timeStr: string): number {
  return durationToSeconds(timeStr);
}

// Format an elapsed-time number of seconds as "12s", "12.3s", or "1:23".
function formatElapsed(secs: number, decimals = 1): string {
  if (!Number.isFinite(secs) || secs < 0) return "0s";
  if (secs >= 60) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return `${secs.toFixed(decimals)}s`;
}

function celebratePersonalBest() {
  const opts = {
    particleCount: 80,
    spread: 65,
    startVelocity: 55,
    ticks: 220,
    gravity: 0.9,
    scalar: 0.9,
    colors: ["#38bdf8", "#a78bfa", "#fbbf24", "#34d399", "#f472b6"],
  };
  confetti({ ...opts, angle: 60,  origin: { x: 0, y: 0.75 } });
  confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.75 } });
}

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
  time: ZERO_DURATION,
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
  // Whether THIS instance of the Tracker is in code mode is purely a
  // function of the route — the /code page passes mode="code", the
  // /practice (root) page does not. The settings.codeMode flag is only
  // a topbar visibility toggle (gates the "Code" tab in Menu/index.tsx);
  // it must NOT bleed into the practice page or every user who'd ever
  // toggled the setting on would have their main typing UI hijacked.
  const effectiveCodeMode = mode === "code";
  const { modal } = useModal();
  const router = useRouter();
  const { currentRace, completeRound, exitRace } = usePvP();

  const [words, setWords] = useState("");
  const [wordList] = useWords();
  const { currentSnippet, nextSnippet } = useCode();
  const [showChange, setShowChange] = useState(false);
  const [showNetCpm, setShowNetCpm] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showTimeElapsed, setShowTimeElapsed] = useState(false);

  const { putResult } = useResults();

  const [
    { correct, incorrect, time, letters, immutableLetters },
    statsDispatch,
  ] = useReducer(statsReducer, initialStat);

  // Get the current text based on mode
  const currentText = effectiveCodeMode ? currentSnippet : words;

  const resetWords = useCallback(async () => {
    // PvP mode: word_set is locked per-round at match creation; never re-sample.
    if (currentRace) {
      setWords(currentRace.round.word_set.join(" "));
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
  const cpm = (showNetCpm ? correct : total) / m;
  const p = (correct / total) * 100;

  // PvP mode locks in the game's keyboard at creation time; race-time
  // accuracy must validate against THAT keyboard, not the user's current
  // global setting (the partner might have a different one).
  const activeKeyboardName: KeyboardLayoutNames = currentRace
    ? (currentRace.match.keyboard as KeyboardLayoutNames)
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
        // PvP mode: submit the round; the provider auto-advances to the next
        // un-raced round (if any) or clears currentRace once the match is
        // decided. Either way we route to the challenge detail page for
        // the round-by-round scoreboard.
        const matchId = currentRace.match.id;
        completeRound({
          cpm: finalCpm,
          correct,
          incorrect,
          time: isoTime,
          key_presses: finalKeyPresses,
        }).then((updated) => {
          if (updated) {
            router.push(`/pvp/challenge?id=${updated.id}`);
          } else {
            router.push(`/pvp/challenge?id=${matchId}`);
          }
        });
      } else {
        // Personal-best celebration. Compare against prior runs in the same
        // partition (matches the leaderboard partition + codeMode/codeLang).
        // First run in a partition (prevBest stays -Infinity) celebrates too,
        // as long as the score itself is meaningful (correct chars typed in
        // measurable time). Earlier code had a `Number.isFinite(prevBest)`
        // guard that silently swallowed every user's first PB.
        if (settings.confettiOnPersonalBest) {
          const minutes = time.total("milliseconds") / 60000;
          const finalNetCpm = minutes > 0 ? correct / minutes : 0;
          let prevBest = -Infinity;
          for (const r of resultsRef.current) {
            if (
              r.keyboard !== settings.keyboardName ||
              r.level !== settings.levelName ||
              r.language !== settings.language ||
              r.capital !== settings.capital ||
              r.punctuation !== settings.punctuation ||
              r.numbers !== settings.numbers ||
              !!r.codeMode !== effectiveCodeMode ||
              (effectiveCodeMode && r.codeLang !== settings.codeLang)
            ) continue;
            const cpmN = netCpmOf(r);
            if (cpmN > prevBest) prevBest = cpmN;
          }
          if (finalNetCpm > 0 && finalNetCpm > prevBest) {
            celebratePersonalBest();
          }
        }

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
    // Local-only — leaves the in-progress race without forfeiting the match.
    // Explicit match-forfeit lives on the challenge page (forfeitMatch RPC).
    exitRace();
    router.push("/pvp");
  };

  const { results } = useResults();

  // Captured in a ref so checkCompletion can read the latest snapshot without
  // re-binding the keypress handler on every result update.
  const resultsRef = useRef<Result[]>(results);
  useEffect(() => { resultsRef.current = results; }, [results]);
  // get the typo/correct diff between the last two results
  const typoDiff = results.length > 1
    ? (showCorrect
        ? results[0].correct   - results[1].correct
        : results[0].incorrect - results[1].incorrect)
    : 0;
  // For "typos" fewer is better (green when ≤ 0); for "correct" more is better (green when ≥ 0).
  const typoDiffIsGood = showCorrect ? typoDiff >= 0 : typoDiff <= 0;

  let cpmDiff = 0;
  let accuracyDiff = 0;
  let timeDiff = 0;
  if (results.length > 1) {
    cpmDiff = showNetCpm
      ? netCpmOf(results[0]) - netCpmOf(results[1])
      : results[0].cpm - results[1].cpm;

    const total0 = results[0].correct + results[0].incorrect;
    const total1 = results[1].correct + results[1].incorrect;
    const acc0 = total0 > 0 ? results[0].correct / total0 : 0;
    const acc1 = total1 > 0 ? results[1].correct / total1 : 0;
    accuracyDiff = acc0 - acc1;

    timeDiff = totalSecondsOf(results[0].time) - totalSecondsOf(results[1].time);
  }
  // For accuracy more is better (green when ≥ 0); for time fewer seconds is better (green when ≤ 0).
  const accuracyDisplayDiff = showTimeElapsed ? timeDiff : accuracyDiff;
  const accuracyDiffIsGood = showTimeElapsed ? timeDiff <= 0 : accuracyDiff >= 0;

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
        {/* Typos — click to toggle between typos and correct count */}
        <button
          type="button"
          onClick={() => setShowCorrect(v => !v)}
          title={showCorrect ? "Showing correct keypresses. Click for typos." : "Showing typos. Click for correct keypresses."}
          className="flex flex-1 items-center justify-center gap-4 py-4 px-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <FontAwesomeIcon
            icon={showCorrect ? faCircleCheck : (effectiveCodeMode ? faCode : faDungeon)}
            className="text-slate-500 dark:text-slate-500 text-3xl flex-shrink-0"
          />
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {showCorrect ? correct : incorrect}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={clsx("text-[13px] font-semibold tabular-nums leading-none", showChange && !currentRace ? typoDiffIsGood ? "text-green-400" : "text-red-400" : "invisible")}>
              {sign(typoDiff)}{typoDiff}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold leading-none">
              {showCorrect ? "correct" : "typos"}
            </span>
          </div>
        </button>
        {/* Speed — click to toggle gross vs net CPM */}
        <button
          type="button"
          onClick={() => setShowNetCpm(v => !v)}
          title={showNetCpm ? "Showing net CPM (correct chars only). Click for gross CPM." : "Showing gross CPM (all keypresses). Click for net CPM."}
          className="flex flex-1 items-center justify-center gap-4 py-4 px-6 border-x border-white/[0.07] cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <FontAwesomeIcon icon={showNetCpm ? faBullseye : faPersonRunning} className="text-slate-500 dark:text-slate-500 text-3xl flex-shrink-0" />
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={clsx("text-[13px] font-semibold tabular-nums leading-none", showChange && !currentRace ? cpmDiff >= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
              {sign(cpmDiff)}{Number.isFinite(cpmDiff) ? cpmDiff.toFixed(0) : "0"}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold leading-none">
              {showNetCpm ? "net char/min" : "char/min"}
            </span>
          </div>
        </button>
        {/* Accuracy — click to toggle between accuracy and elapsed time */}
        <button
          type="button"
          onClick={() => setShowTimeElapsed(v => !v)}
          title={showTimeElapsed ? "Showing elapsed time. Click for accuracy." : "Showing accuracy. Click for elapsed time."}
          className="flex flex-1 items-center justify-center gap-4 py-4 px-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <FontAwesomeIcon icon={showTimeElapsed ? faClock : faPercentage} className="text-slate-500 dark:text-slate-500 text-3xl flex-shrink-0" />
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {showTimeElapsed
              ? formatElapsed(d.total("milliseconds") / 1000, 0)
              : (Number.isFinite(p) ? p.toFixed(0) : 0)}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className={clsx("text-[13px] font-semibold tabular-nums leading-none", showChange && !currentRace ? accuracyDiffIsGood ? "text-green-400" : "text-red-400" : "invisible")}>
              {showTimeElapsed
                ? `${sign(accuracyDisplayDiff)}${Number.isFinite(accuracyDisplayDiff) ? accuracyDisplayDiff.toFixed(1) : "0.0"}s`
                : `${sign(accuracyDisplayDiff)}${Number.isFinite(accuracyDisplayDiff) ? (accuracyDisplayDiff * 100).toFixed(1) : "0.0"}%`}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold leading-none">
              {showTimeElapsed ? "elapsed" : "accuracy"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );

  const verticalStats = (
    <div className="flex flex-col gap-2 w-20 flex-shrink-0 font-mono">
      {/* Typos — click to toggle between typos and correct count */}
      <button
        type="button"
        onClick={() => setShowCorrect(v => !v)}
        title={showCorrect ? "Showing correct keypresses. Click for typos." : "Showing typos. Click for correct keypresses."}
        className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.07] cursor-pointer hover:bg-white/[0.06] transition-colors"
      >
        <FontAwesomeIcon icon={showCorrect ? faCircleCheck : faCode} className="text-slate-500 text-base" />
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{showCorrect ? correct : incorrect}</span>
        <span className="text-[8px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold">{showCorrect ? "correct" : "typos"}</span>
        <span className={clsx("text-[10px] font-semibold tabular-nums", showChange && !currentRace ? typoDiffIsGood ? "text-green-400" : "text-red-400" : "invisible")}>
          {sign(typoDiff)}{typoDiff}
        </span>
      </button>
      {/* Speed — click to toggle gross vs net CPM */}
      <button
        type="button"
        onClick={() => setShowNetCpm(v => !v)}
        title={showNetCpm ? "Showing net CPM (correct chars only). Click for gross CPM." : "Showing gross CPM (all keypresses). Click for net CPM."}
        className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.07] cursor-pointer hover:bg-white/[0.06] transition-colors"
      >
        <FontAwesomeIcon icon={showNetCpm ? faBullseye : faPersonRunning} className="text-slate-500 text-base" />
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{Number.isFinite(cpm) ? cpm.toFixed(0) : 0}</span>
        <span className="text-[8px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold">
          {showNetCpm ? "net chr/min" : "chr/min"}
        </span>
        <span className={clsx("text-[10px] font-semibold tabular-nums", showChange && !currentRace ? cpmDiff >= 0 ? "text-green-400" : "text-red-400" : "invisible")}>
          {sign(cpmDiff)}{Number.isFinite(cpmDiff) ? cpmDiff.toFixed(0) : "0"}
        </span>
      </button>
      {/* Accuracy — click to toggle between accuracy and elapsed time */}
      <button
        type="button"
        onClick={() => setShowTimeElapsed(v => !v)}
        title={showTimeElapsed ? "Showing elapsed time. Click for accuracy." : "Showing accuracy. Click for elapsed time."}
        className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.07] cursor-pointer hover:bg-white/[0.06] transition-colors"
      >
        <FontAwesomeIcon icon={showTimeElapsed ? faClock : faPercentage} className="text-slate-500 text-base" />
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {showTimeElapsed
            ? formatElapsed(d.total("milliseconds") / 1000, 0)
            : (Number.isFinite(p) ? p.toFixed(0) : 0)}
        </span>
        <span className="text-[8px] uppercase tracking-widest text-gray-500 dark:text-gray-600 font-semibold">{showTimeElapsed ? "elapsed" : "accur."}</span>
        <span className={clsx("text-[10px] font-semibold tabular-nums", showChange && !currentRace ? accuracyDiffIsGood ? "text-green-400" : "text-red-400" : "invisible")}>
          {showTimeElapsed
            ? `${sign(accuracyDisplayDiff)}${Number.isFinite(accuracyDisplayDiff) ? accuracyDisplayDiff.toFixed(1) : "0.0"}s`
            : `${sign(accuracyDisplayDiff)}${Number.isFinite(accuracyDisplayDiff) ? (accuracyDisplayDiff * 100).toFixed(0) : "0"}%`}
        </span>
      </button>
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
        heightSubtraction={effectiveCodeMode && !currentRace ? 455 : 300}
      />
    </div>
  );
}
