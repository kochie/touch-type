"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faExclamationTriangle } from "@fortawesome/pro-duotone-svg-icons";
import PvPMatch, { type PvPRaceResult } from "@/components/PvP/PvPMatch";
import {
  PvPChallenge,
  usePvP,
  type ChallengeSettings,
} from "@/lib/pvp-provider";
import { useSettings } from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import { useSupabase } from "@/lib/supabase-provider";
import clsx from "clsx";

const WORD_COUNT = 15;

function generateWordSet(wordList: string[]): string[] {
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, WORD_COUNT);
}

function RacePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { createChallenge, submitOpponentResult, fetchById } = usePvP();
  const settings = useSettings();
  const [wordList] = useWords();

  const isCreating = searchParams.get("new") === "1";
  const challengeIdParam = searchParams.get("id");

  const [challenge, setChallenge] = useState<PvPChallenge | null>(null);
  const [wordSet, setWordSet] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialise: either generate a fresh word set (creator) or fetch the challenge (opponent).
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (isCreating) {
        if (wordList.length === 0) return;
        setWordSet(generateWordSet(wordList));
        return;
      }
      if (challengeIdParam) {
        const c = await fetchById(challengeIdParam);
        if (cancelled) return;
        if (!c) {
          setError("Challenge not found");
          return;
        }
        if (c.status !== "claimed") {
          setError(`Challenge is ${c.status}, not ready to race`);
          return;
        }
        if (c.opponent_id !== user?.id) {
          setError("You aren't the claimer of this challenge");
          return;
        }
        setChallenge(c);
        setWordSet(c.word_set);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [isCreating, challengeIdParam, wordList, user, fetchById]);

  const handleComplete = async (result: PvPRaceResult) => {
    setSubmitting(true);
    if (isCreating) {
      const challengeSettings: ChallengeSettings = {
        keyboard: settings.keyboardName,
        level: settings.levelName,
        language: settings.language,
        capital: settings.capital,
        punctuation: settings.punctuation,
        numbers: settings.numbers,
        word_set: wordSet ?? [],
      };
      const created = await createChallenge(
        {
          cpm: result.cpm,
          correct: result.correct,
          incorrect: result.incorrect,
          time: result.time,
          key_presses: result.keyPresses,
        },
        challengeSettings,
      );
      setSubmitting(false);
      if (created) {
        router.push(`/pvp/challenge?id=${created.id}`);
      }
      return;
    }

    if (challenge) {
      const updated = await submitOpponentResult(challenge.id, {
        cpm: result.cpm,
        correct: result.correct,
        incorrect: result.incorrect,
        time: result.time,
        key_presses: result.keyPresses,
      });
      setSubmitting(false);
      if (updated) {
        router.push(`/pvp/challenge?id=${updated.id}`);
      }
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <FontAwesomeIcon
          icon={faSpinner}
          className="w-8 h-8 text-gray-400 animate-spin"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Sign in to race
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className="w-8 h-8 text-red-500 mb-3"
        />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {error}
        </h2>
        <button
          onClick={() => router.push("/pvp")}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
            "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            "text-gray-700 dark:text-gray-300 transition-colors",
          )}
        >
          Back to PvP
        </button>
      </div>
    );
  }

  if (!wordSet || submitting) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <FontAwesomeIcon
          icon={faSpinner}
          className="w-8 h-8 text-gray-400 animate-spin"
        />
      </div>
    );
  }

  return (
    <PvPMatch
      wordSet={wordSet}
      keyboardName={settings.keyboardName}
      targetCpm={challenge?.challenger_cpm}
      onComplete={handleComplete}
    />
  );
}

export default function RacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <FontAwesomeIcon
            icon={faSpinner}
            className="w-8 h-8 text-gray-400 animate-spin"
          />
        </div>
      }
    >
      <RacePageInner />
    </Suspense>
  );
}
