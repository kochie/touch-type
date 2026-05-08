"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PvPChallenge, usePvP } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faLink,
  faTrophy,
  faHourglass,
  faTrash,
} from "@fortawesome/pro-duotone-svg-icons";
import { toast } from "sonner";
import clsx from "clsx";

function ChallengePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { fetchById, cancelChallenge, startClaimedRace } = usePvP();

  const id = searchParams.get("id");
  const [challenge, setChallenge] = useState<PvPChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError("Invalid challenge ID");
        setIsLoading(false);
        return;
      }
      const c = await fetchById(id);
      if (cancelled) return;
      if (!c) setError("Challenge not found");
      else setChallenge(c);
      setIsLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, fetchById]);

  const handleCopyLink = async () => {
    if (!challenge) return;
    const link = `touchtyper://pvp/invite/${challenge.invite_code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {error ?? "Challenge not found"}
        </h2>
        <button
          onClick={() => router.push("/pvp")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          Back to PvP
        </button>
      </div>
    );
  }

  const isChallenger = challenge.challenger_id === user?.id;
  const isOpponent = challenge.opponent_id === user?.id;

  if (!isChallenger && !isOpponent) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Access denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You aren't a participant in this challenge.
        </p>
        <button onClick={() => router.push("/pvp")}>Back to PvP</button>
      </div>
    );
  }

  // status: open + challenger → success view with link
  if (challenge.status === "open" && isChallenger) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center">
          <FontAwesomeIcon icon={faTrophy} className="w-12 h-12 text-yellow-500 mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your race is locked in
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You scored <strong>{Math.round(challenge.challenger_cpm)} CPM</strong>.
            Share the link below — whoever claims it must beat your time.
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
            Invite Link
          </p>
          <div className="flex items-center gap-2">
            <code
              data-testid="pvp-invite-link"
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-md text-sm font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 break-all select-all"
            >
              {`touchtyper://pvp/invite/${challenge.invite_code}`}
            </code>
            <button
              onClick={handleCopyLink}
              title="Copy invite link"
              aria-label="Copy invite link"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faLink} className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          data-testid="pvp-cancel-challenge"
          onClick={async () => {
            if (await cancelChallenge(challenge.id)) router.push("/pvp");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          Cancel Challenge
        </button>
      </div>
    );
  }

  // status: claimed + opponent (not yet finished) → continue race CTA
  if (challenge.status === "claimed" && isOpponent && !challenge.opponent_completed_at) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <FontAwesomeIcon icon={faHourglass} className="w-12 h-12 text-blue-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Race not finished
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You claimed this challenge — type the same word set to lock in your result.
        </p>
        <button
          onClick={() => {
            startClaimedRace(challenge);
            router.push("/");
          }}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white"
        >
          Continue Race
        </button>
      </div>
    );
  }

  // status: claimed + challenger → waiting
  if (challenge.status === "claimed" && isChallenger) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3">
        <FontAwesomeIcon icon={faHourglass} className="w-10 h-10 text-blue-500 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Waiting for opponent
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Someone has claimed your challenge — they're racing now.
        </p>
      </div>
    );
  }

  // status: completed → results
  if (challenge.status === "completed") {
    const winner = challenge.winner_id;
    const winnerLabel =
      winner === user?.id
        ? "You won!"
        : winner === null
          ? "It's a tie"
          : "You lost";
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="text-center">
          <FontAwesomeIcon icon={faTrophy} className="w-12 h-12 text-yellow-500 mb-3" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{winnerLabel}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={clsx(
            "p-4 rounded-xl text-center",
            winner === challenge.challenger_id
              ? "bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-500"
              : "bg-gray-50 dark:bg-gray-900/50"
          )}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Challenger</p>
            <p className="text-3xl font-bold">{Math.round(challenge.challenger_cpm)}</p>
            <p className="text-xs text-gray-500">CPM</p>
            <p className="text-xs text-gray-500 mt-2">
              {challenge.challenger_correct}/{challenge.challenger_correct + challenge.challenger_incorrect} correct
            </p>
          </div>
          <div className={clsx(
            "p-4 rounded-xl text-center",
            winner === challenge.opponent_id
              ? "bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-500"
              : "bg-gray-50 dark:bg-gray-900/50"
          )}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Opponent</p>
            <p className="text-3xl font-bold">
              {challenge.opponent_cpm !== null ? Math.round(challenge.opponent_cpm) : "—"}
            </p>
            <p className="text-xs text-gray-500">CPM</p>
            <p className="text-xs text-gray-500 mt-2">
              {challenge.opponent_correct ?? 0}/
              {(challenge.opponent_correct ?? 0) + (challenge.opponent_incorrect ?? 0)} correct
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/pvp")}
          className="w-full px-4 py-3 rounded-xl font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          Back to PvP
        </button>
      </div>
    );
  }

  // status: cancelled / expired
  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Challenge {challenge.status}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This challenge is no longer playable.
      </p>
      <button onClick={() => router.push("/pvp")}>Back to PvP</button>
    </div>
  );
}

export default function ChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      }
    >
      <ChallengePageInner />
    </Suspense>
  );
}
