"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { type PvPMatch, usePvP } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faLink,
  faTrophy,
  faHourglass,
  faTrash,
  faPlay,
  faFlag,
} from "@fortawesome/pro-duotone-svg-icons";
import { toast } from "sonner";
import clsx from "clsx";

function ChallengePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { fetchById, cancelMatch, forfeitMatch, startRace } = usePvP();

  const id = searchParams.get("id");
  const [match, setMatch] = useState<PvPMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError("Invalid match ID");
        setIsLoading(false);
        return;
      }
      const m = await fetchById(id);
      if (cancelled) return;
      if (!m) setError("Match not found");
      else setMatch(m);
      setIsLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, fetchById]);

  const handleCopyLink = async () => {
    if (!match) return;
    const link = `touchtyper://pvp/invite/${match.invite_code}`;
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
        <FontAwesomeIcon
          icon={faSpinner}
          className="w-8 h-8 text-gray-400 animate-spin"
        />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className="w-8 h-8 text-red-500 mb-3"
        />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {error ?? "Match not found"}
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

  const isCreator = match.creator_id === user?.id;
  const isJoiner = match.joiner_id === user?.id;
  const isParticipant = isCreator || isJoiner;

  if (!isParticipant) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Access denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You aren&apos;t a participant in this match. If a friend shared the
          invite link, open it directly to join.
        </p>
        <button
          onClick={() => router.push("/pvp")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          Back to PvP
        </button>
      </div>
    );
  }

  const hasUnracedRound = match.rounds.some(
    (r) =>
      (isCreator ? r.creator_completed_at : r.joiner_completed_at) === null,
  );
  const opponentHasRacedAny = match.rounds.some(
    (r) =>
      (isCreator ? r.joiner_completed_at : r.creator_completed_at) !== null,
  );

  // Cancelled / expired — terminal.
  if (match.status === "cancelled" || match.status === "expired") {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Match {match.status}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This match is no longer playable.
        </p>
        <button
          onClick={() => router.push("/pvp")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          Back to PvP
        </button>
      </div>
    );
  }

  // Completed — series result + per-round breakdown
  if (match.status === "completed") {
    const winner = match.winner_id;
    const winnerLabel =
      winner === user?.id ? "You won!" : "You lost";
    const seriesScore = `${match.creator_wins}–${match.joiner_wins}`;

    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="text-center">
          <FontAwesomeIcon
            icon={faTrophy}
            className="w-12 h-12 text-yellow-500 mb-3"
          />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {winnerLabel}
          </h2>
          {match.best_of > 1 && (
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Series: <span className="font-semibold">{seriesScore}</span>{" "}
              ({`best of ${match.best_of}`})
            </p>
          )}
          {match.forfeited_by && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              {match.forfeited_by === user?.id
                ? "You forfeited"
                : "Opponent forfeited"}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {match.rounds.map((r) => {
            const creatorWon = r.winner_id === match.creator_id;
            const joinerWon = r.winner_id === match.joiner_id;
            return (
              <div
                key={r.id}
                className="grid grid-cols-[auto_1fr_1fr] items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
              >
                <span className="text-sm font-mono text-gray-500">
                  R{r.round_number}
                </span>
                <div
                  className={clsx(
                    "text-center",
                    creatorWon && "ring-2 ring-yellow-500 rounded-lg p-1.5",
                  )}
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {match.creator_id === user?.id ? "You" : "Creator"}
                  </p>
                  <p className="text-xl font-bold">
                    {r.creator_cpm !== null ? Math.round(r.creator_cpm) : "—"}{" "}
                    <span className="text-xs font-normal text-gray-500">CPM</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {r.creator_correct ?? 0}/
                    {(r.creator_correct ?? 0) + (r.creator_incorrect ?? 0)} correct
                  </p>
                </div>
                <div
                  className={clsx(
                    "text-center",
                    joinerWon && "ring-2 ring-yellow-500 rounded-lg p-1.5",
                  )}
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {match.joiner_id === user?.id ? "You" : "Joiner"}
                  </p>
                  <p className="text-xl font-bold">
                    {r.joiner_cpm !== null ? Math.round(r.joiner_cpm) : "—"}{" "}
                    <span className="text-xs font-normal text-gray-500">CPM</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {r.joiner_correct ?? 0}/
                    {(r.joiner_correct ?? 0) + (r.joiner_incorrect ?? 0)} correct
                  </p>
                </div>
              </div>
            );
          })}
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

  // Live (open or in_progress)
  const seriesScore = `${match.creator_wins}–${match.joiner_wins}`;
  const totalRounds = match.rounds.length;
  const playedRounds = match.rounds.filter((r) => r.completed_at !== null).length;

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center">
        <FontAwesomeIcon
          icon={hasUnracedRound ? faPlay : faHourglass}
          className={clsx(
            "w-12 h-12 mb-3",
            hasUnracedRound ? "text-yellow-500" : "text-blue-500 animate-pulse",
          )}
        />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {hasUnracedRound ? "Your race awaits" : "Waiting for the other player"}
        </h2>
        {match.best_of > 1 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Round {playedRounds + (hasUnracedRound ? 1 : 0)} of {totalRounds} ·
            Series {seriesScore}
          </p>
        )}
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {hasUnracedRound
            ? "Pick your moment — you can race now or come back later. The other side won't see your score until they finish theirs."
            : "We'll show you the result once they finish their race."}
        </p>
      </div>

      {/* Round-by-round running scoreboard (best-of-N only) */}
      {match.best_of > 1 && (
        <div className="grid gap-2">
          {match.rounds.map((r) => {
            const mineDone =
              (isCreator ? r.creator_completed_at : r.joiner_completed_at) !== null;
            const theirsDone =
              (isCreator ? r.joiner_completed_at : r.creator_completed_at) !== null;
            const decided = r.completed_at !== null;
            return (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-xs"
              >
                <span className="font-mono text-gray-500">
                  Round {r.round_number}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {decided
                    ? r.winner_id === user?.id
                      ? "Won"
                      : "Lost"
                    : mineDone
                      ? "Waiting on opponent"
                      : theirsDone
                        ? "Opponent finished — your turn"
                        : "Not started"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite link (creators only, only when no joiner) */}
      {isCreator && !match.joiner_id && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
            Invite Link
          </p>
          <div className="flex items-center gap-2">
            <code
              data-testid="pvp-invite-link"
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-md text-sm font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 break-all select-all"
            >
              {`touchtyper://pvp/invite/${match.invite_code}`}
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Share this with one person — first to use it claims the second slot.
          </p>
        </div>
      )}

      {/* Play / Cancel / Forfeit buttons */}
      <div className="space-y-3">
        {hasUnracedRound && (
          <button
            data-testid="pvp-play-now"
            onClick={() => {
              startRace(match);
              router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
            {match.best_of > 1 && playedRounds > 0
              ? `Play Round ${playedRounds + 1}`
              : "Play Now"}
          </button>
        )}

        {/* Cancel — only valid when no submissions yet, per cancel_match RPC */}
        {isCreator && !opponentHasRacedAny && !playedRounds && (
          <button
            data-testid="pvp-cancel-match"
            onClick={async () => {
              if (await cancelMatch(match.id)) router.push("/pvp");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            Cancel Match
          </button>
        )}

        {/* Forfeit — only available once the joiner has joined. */}
        {match.joiner_id && (
          <button
            data-testid="pvp-forfeit-match"
            onClick={async () => {
              const result = await forfeitMatch(match.id);
              if (result) router.push(`/pvp/challenge?id=${match.id}`);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300"
          >
            <FontAwesomeIcon icon={faFlag} className="w-4 h-4" />
            Forfeit Match
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChallengePage() {
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
      <ChallengePageInner />
    </Suspense>
  );
}
