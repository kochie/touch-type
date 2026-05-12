"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { LetterStat, statsReducer, StatState } from "../Tracker/reducers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPercentage,
  faPersonRunning,
  faPlay,
  faTrophy,
  faUserClock,
} from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/keyboards/key";
import { lookupKeyboard, KeyboardLayoutNames } from "@/keyboards";
import { ModalType, useModal } from "@/lib/modal-provider";

export interface PvPRaceResult {
  cpm: number;
  correct: number;
  incorrect: number;
  time: string; // ISO duration
  keyPresses: LetterStat[];
}

interface PvPMatchProps {
  wordSet: string[];
  keyboardName: string;
  /** Optional CPM target shown above the typing area (challenger's score). */
  targetCpm?: number;
  onComplete: (result: PvPRaceResult) => void;
}

const initialStat: StatState = {
  correct: 0,
  incorrect: 0,
  time: Temporal.Duration.from({ milliseconds: 0 }),
  start: Temporal.Now.instant(),
  letters: [] as LetterStat[],
  immutableLetters: [] as LetterStat[],
};

interface KeyPress {
  key: Key;
  ttl: number;
  i: number;
  j: number;
  correct: boolean;
}

interface CurrentKeyRef {
  current: Key;
  i: number;
  j: number;
}

export default function PvPMatch({
  wordSet,
  keyboardName,
  targetCpm,
  onComplete,
}: PvPMatchProps) {
  const { modal } = useModal();
  const [gameState, setGameState] = useState<"ready" | "playing" | "completed">(
    "ready",
  );
  const words = wordSet.join(" ");

  const [{ correct, incorrect, time, letters, immutableLetters }, statsDispatch] =
    useReducer(statsReducer, initialStat);

  const keys = useRef<KeyPress[]>([]);
  const [currentKey, setCurrentKey] = useState<CurrentKeyRef>();

  const keyboardLayout = lookupKeyboard(keyboardName as KeyboardLayoutNames);
  const keyboard = new Keyboard(keyboardLayout);

  useLayoutEffect(() => {
    if (words.length === 0) return;
    if (gameState !== "playing") return;
    const next = words[letters.length]?.toLowerCase();
    if (!next || !keyboard.keyExists(next)) return;
    const key = keyboard.findKey(next);
    const [i, j] = keyboard.findIndex(next);
    setCurrentKey({ current: key, i, j });
  }, [letters.length, words, gameState]);

  const d = time;
  const total = correct + incorrect;
  const m = d.total("milliseconds") / 1000 / 60;
  const cpm = total / (m || 1);

  const intervalFn = () => {
    if (letters.length > 0 && gameState === "playing")
      statsDispatch({ type: "TICK" });
  };

  const handleComplete = useCallback(() => {
    setGameState("completed");
    const finalCpm =
      (correct + incorrect) /
      (time.total("milliseconds") / 1000 / 60);
    onComplete({
      cpm: finalCpm,
      correct,
      incorrect,
      time: time.toString(),
      keyPresses: [...immutableLetters],
    });
  }, [correct, incorrect, time, immutableLetters, onComplete]);

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    if (modal !== ModalType.NONE || gameState !== "playing") return;
    e.preventDefault();
    if (e.key === "Shift") return;
    if (e.key === "Backspace") {
      statsDispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key === "Escape") return; // no reset in PvP
    if (!keyboard.keyExists(e.key.toLowerCase())) return;

    if (letters.length === 0) statsDispatch({ type: "START" });

    const key = keyboard.findKey(e.key.toLowerCase());
    const [i, j] = keyboard.findIndex(e.key.toLowerCase());
    if (key.isInert) return;

    if (e.key === words[letters.length]) {
      statsDispatch({ type: "CORRECT", key: words[letters.length] });
      keys.current.push({ key, ttl: 255, i, j, correct: true });
    } else {
      statsDispatch({
        type: "INCORRECT",
        key: words[letters.length],
        pressedKey: e.key,
      });
      keys.current.push({ key, ttl: 255, i, j, correct: false });
    }

    if (letters.length === words.length - 1) handleComplete();

    if (e.key === words[letters.length]) {
      keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
    } else {
      keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
    }
  };

  if (gameState === "ready") {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        {targetCpm !== undefined && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Target to beat: <span className="font-bold">{Math.round(targetCpm)} CPM</span>
          </p>
        )}
        <button
          onClick={() => setGameState("playing")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-colors"
        >
          <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
          Start Race
        </button>
      </div>
    );
  }

  if (gameState === "completed") {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-3">
        <FontAwesomeIcon icon={faTrophy} className="w-12 h-12 text-yellow-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Race complete!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">Submitting your result…</p>
      </div>
    );
  }

  // Playing
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex justify-around mb-4 text-sm text-gray-700 dark:text-gray-300">
        <span><FontAwesomeIcon icon={faPersonRunning} /> {Math.round(cpm)} cpm</span>
        <span><FontAwesomeIcon icon={faPercentage} /> {total > 0 ? Math.round((correct / total) * 100) : 0}%</span>
        <span><FontAwesomeIcon icon={faUserClock} /> {(() => { const ms = d.total("milliseconds"); const mins = Math.floor(ms / 60000); const secs = Math.floor((ms % 60000) / 1000); return `${mins}:${secs.toString().padStart(2, "0")}`; })()}</span>
      </div>
      <Canvas
        letters={letters}
        currentKey={currentKey}
        keys={keys}
        keyDown={keyDown}
        intervalFn={intervalFn}
      />
    </div>
  );
}
