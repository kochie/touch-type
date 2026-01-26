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
import { DateTime, Duration, Interval } from "luxon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDungeon,
  faPercentage,
  faPersonRunning,
  faTrophy,
  faUserClock,
  faPlay,
  faRedo,
} from "@fortawesome/pro-duotone-svg-icons";
import Canvas from "../Canvas";
import { Key, Keyboard } from "@/keyboards/key";
import { lookupKeyboard, KeyboardLayoutNames } from "@/keyboards";
import { Result, useResults } from "@/lib/result-provider";
import { ModalType, useModal } from "@/lib/modal-provider";
import clsx from "clsx";
import { PvPChallenge, usePvP, hasUserCompleted } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { useRouter } from "next/navigation";

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
  time: Interval.after(DateTime.now(), 0),
  start: DateTime.now(),
  letters: [] as LetterStat[],
  immutableLetters: [] as LetterStat[],
};

interface PvPMatchProps {
  challenge: PvPChallenge;
  onComplete?: () => void;
}

export default function PvPMatch({ challenge, onComplete }: PvPMatchProps) {
  const { modal } = useModal();
  const { user } = useSupabase();
  const { submitResult, getChallengeById } = usePvP();
  const { putResult } = useResults();
  const router = useRouter();

  const [gameState, setGameState] = useState<"ready" | "playing" | "completed" | "waiting">("ready");
  const [updatedChallenge, setUpdatedChallenge] = useState<PvPChallenge>(challenge);

  // Use the fixed word set from the challenge
  const words = challenge.word_set.join(" ");

  const [{ correct, incorrect, time, letters, immutableLetters }, statsDispatch] =
    useReducer(statsReducer, initialStat);

  const keys = useRef<KeyPress[]>([]);
  const [currentKey, setCurrentKey] = useState<CurrentKeyRef>();

  const keyboardLayout = lookupKeyboard(challenge.keyboard as KeyboardLayoutNames);
  const keyboard = new Keyboard(keyboardLayout);

  const isChallenger = challenge.challenger_id === user?.id;
  const userCompleted = user ? hasUserCompleted(challenge, user.id) : false;

  // Check if user already completed
  useEffect(() => {
    if (userCompleted) {
      setGameState("waiting");
    }
  }, [userCompleted]);

  useLayoutEffect(() => {
    if (words.length === 0) return;
    if (gameState !== "playing") return;
    if (!keyboard.keyExists(words[letters.length]?.toLowerCase())) return;
    const key = keyboard.findKey(words[letters.length].toLowerCase());
    const [i, j] = keyboard.findIndex(words[letters.length].toLowerCase());
    setCurrentKey({ current: key, i, j });
  }, [letters.length, words, gameState]);

  const d = (time as Interval).toDuration();
  const total = correct + incorrect;
  const m = d.toMillis() / 1000 / 60;
  const cpm = total / m;
  const p = (correct / total) * 100;

  const intervalFn = () => {
    if (letters.length > 0 && gameState === "playing") statsDispatch({ type: "TICK" });
  };

  const handleComplete = useCallback(async () => {
    if (!user) return;

    setGameState("completed");

    const results: Result = {
      correct,
      incorrect,
      keyPresses: [...immutableLetters],
      time: (time as Interval).toDuration().toISO() ?? "",
      datetime: new Date().toISOString(),
      level: challenge.level,
      keyboard: challenge.keyboard,
      language: challenge.language,
      capital: challenge.capital,
      punctuation: challenge.punctuation,
      numbers: challenge.numbers,
      cpm: (correct + incorrect) / ((time as Interval).toDuration().toMillis() / 1000 / 60),
    };

    // Save result locally
    const savedResult = await putResult(results);

    // Submit to challenge
    if (savedResult?.id) {
      await submitResult(challenge.id, savedResult.id);
    }

    // Refresh challenge data
    const updated = await getChallengeById(challenge.id);
    if (updated) {
      setUpdatedChallenge(updated);
      
      // Check if both players have completed
      if (updated.challenger_result_id && updated.opponent_result_id) {
        // Challenge is complete
        setGameState("completed");
      } else {
        setGameState("waiting");
      }
    }

    onComplete?.();
  }, [user, correct, incorrect, immutableLetters, time, challenge, putResult, submitResult, getChallengeById, onComplete]);

  const keyDown = (e: KeyboardEvent, ctx: CanvasRenderingContext2D) => {
    if (modal !== ModalType.NONE || gameState !== "playing") {
      return;
    }
    e.preventDefault();

    if (e.key === "Shift") return;

    if (e.key === "Backspace") {
      statsDispatch({ type: "BACKSPACE" });
      return;
    }
    if (e.key === "Escape") {
      // In PvP mode, don't allow reset
      return;
    }
    if (!keyboard.keyExists(e.key.toLowerCase())) return;

    if (letters.length === 0) {
      statsDispatch({ type: "START" });
    }

    const key = keyboard.findKey(e.key.toLowerCase());
    const [i, j] = keyboard.findIndex(e.key.toLowerCase());

    if (key.isInert) return;

    if (e.key === words[letters.length]) {
      statsDispatch({ type: "CORRECT", key: words[letters.length] });
      keys.current.push({ key: key, ttl: 255, i, j, correct: true });
    } else {
      statsDispatch({
        type: "INCORRECT",
        key: words[letters.length],
        pressedKey: e.key,
      });
      keys.current.push({ key: key, ttl: 255, i, j, correct: false });
    }

    if (letters.length === words.length - 1) {
      handleComplete();
    }

    if (e.key === words[letters.length]) {
      keyboard.drawKey(ctx, i, j, key, "rgba(0, 255, 0, 0.5)");
    } else {
      keyboard.drawKey(ctx, i, j, key, "rgba(255, 0, 0, 0.5)");
    }
  };

  const handleStart = () => {
    setGameState("playing");
    statsDispatch({ type: "RESET" });
  };

  const handleBackToHub = () => {
    router.push("/pvp");
  };

  // Ready state - show start button
  if (gameState === "ready") {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Challenge vs {isChallenger ? challenge.opponent_username : challenge.challenger_username}
          </h2>
          {challenge.message && (
            <p className="text-gray-600 dark:text-gray-400 italic">
              "{challenge.message}"
            </p>
          )}
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Challenge Settings
          </h3>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              Level {challenge.level}
            </span>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {challenge.keyboard}
            </span>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {challenge.language.toUpperCase()}
            </span>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {challenge.word_set.length} words
            </span>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Type the words as fast and accurately as you can. Press Start when ready!
        </p>

        <button
          onClick={handleStart}
          className={clsx(
            "inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg",
            "bg-green-500 hover:bg-green-600 text-white",
            "transition-colors shadow-lg"
          )}
        >
          <FontAwesomeIcon icon={faPlay} className="w-6 h-6" />
          Start Challenge
        </button>
      </div>
    );
  }

  // Waiting state - user completed, waiting for opponent
  if (gameState === "waiting") {
    const finalCpm = isChallenger ? updatedChallenge.challenger_cpm : updatedChallenge.opponent_cpm;
    
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faUserClock}
            className="w-10 h-10 text-blue-500 animate-pulse"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Great job!
        </h2>
        {finalCpm && (
          <p className="text-4xl font-bold text-blue-500 mb-4">
            {finalCpm.toFixed(0)} CPM
          </p>
        )}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Waiting for {isChallenger ? challenge.opponent_username : challenge.challenger_username} to complete...
        </p>
        <button
          onClick={handleBackToHub}
          className={clsx(
            "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium",
            "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            "text-gray-700 dark:text-gray-300 transition-colors"
          )}
        >
          Back to PvP Hub
        </button>
      </div>
    );
  }

  // Completed state - both players finished
  if (gameState === "completed" && updatedChallenge.status === "completed") {
    const isWinner = updatedChallenge.winner_id === user?.id;
    
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className={clsx(
          "w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center",
          isWinner ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-gray-100 dark:bg-gray-800"
        )}>
          <FontAwesomeIcon
            icon={faTrophy}
            className={clsx(
              "w-10 h-10",
              isWinner ? "text-yellow-500" : "text-gray-400"
            )}
          />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {isWinner ? "You Won!" : "You Lost"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Winner: {updatedChallenge.winner_username}
        </p>

        {/* Results comparison */}
        <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <div className={clsx(
            "p-4 rounded-lg",
            isChallenger && isWinner && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
          )}>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {isChallenger ? "You" : updatedChallenge.challenger_username}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {updatedChallenge.challenger_cpm?.toFixed(0)} CPM
            </p>
            <p className="text-sm text-gray-500">
              {updatedChallenge.challenger_correct}/{(updatedChallenge.challenger_correct || 0) + (updatedChallenge.challenger_incorrect || 0)} correct
            </p>
          </div>
          <div className={clsx(
            "p-4 rounded-lg",
            !isChallenger && isWinner && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
          )}>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {!isChallenger ? "You" : updatedChallenge.opponent_username}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {updatedChallenge.opponent_cpm?.toFixed(0)} CPM
            </p>
            <p className="text-sm text-gray-500">
              {updatedChallenge.opponent_correct}/{(updatedChallenge.opponent_correct || 0) + (updatedChallenge.opponent_incorrect || 0)} correct
            </p>
          </div>
        </div>

        <button
          onClick={handleBackToHub}
          className={clsx(
            "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium",
            "bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          )}
        >
          <FontAwesomeIcon icon={faRedo} className="w-5 h-5" />
          Back to PvP Hub
        </button>
      </div>
    );
  }

  // Playing state
  return (
    <div className="">
      {/* Opponent info banner */}
      <div className="text-center py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
          PvP Challenge vs {isChallenger ? challenge.opponent_username : challenge.challenger_username}
        </p>
      </div>

      <div className="flex gap-10 justify-between pt-10 font-mono mx-auto w-[600px]">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faDungeon} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{incorrect}</p>
            <p className="text-sm text-gray-400">typos</p>
          </div>
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPersonRunning} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">
              {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
            </p>
            <p className="text-sm text-gray-400">char/min</p>
          </div>
        </div>
        <div className="flex items-center">
          <FontAwesomeIcon icon={faPercentage} size="3x" />
          <div className="ml-5">
            <p className="text-4xl">{Number.isFinite(p) ? p.toFixed(0) : 0}</p>
            <p className="text-sm text-gray-400">accuracy</p>
          </div>
        </div>
      </div>
      <p className="font-['Roboto_Mono'] text-center p-10 whitespace-pre-wrap">
        {letters.map((letter, i) => (
          <span
            key={i}
            className={letter.correct ? "text-gray-400" : "bg-red-500"}
          >
            {letter.key}
          </span>
        ))}
        <span className="bg-yellow-600 font-bold text-gray-200">
          {words[letters.length]}
        </span>
        {words.substring(letters.length + 1, words.length)}
      </p>

      <Canvas
        letters={letters}
        currentKey={currentKey}
        keyDown={keyDown}
        keys={keys}
        intervalFn={intervalFn}
      />
    </div>
  );
}
