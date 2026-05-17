"use client";

import { usePvP, type PvPMatch } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import {
  faClock,
  faCrown,
  faGamepad,
  faHourglass,
  faPlay,
  faTrash,
  faTrophy,
  faUserSlash,
} from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { formatDistanceToNow } from "@/lib/relative-time";
import { useRouter } from "next/navigation";

interface ChallengeCardProps {
  match: PvPMatch;
  compact?: boolean;
}

export default function ChallengeCard({
  match,
  compact = false,
}: ChallengeCardProps) {
  const { user } = useSupabase();
  const { cancelMatch, startRace } = usePvP();
  const router = useRouter();

  if (!user) return null;

  const isCreator = match.creator_id === user.id;
  const isJoiner = match.joiner_id === user.id;
  const isParticipant = isCreator || isJoiner;

  const hasUnracedRound = match.rounds.some(
    (r) =>
      (isCreator ? r.creator_completed_at : r.joiner_completed_at) === null,
  );
  const opponentHasRacedAny = match.rounds.some(
    (r) =>
      (isCreator ? r.joiner_completed_at : r.creator_completed_at) !== null,
  );

  const creatorName = isCreator ? "You" : `Player ${match.creator_id.slice(0, 8)}`;
  const joinerName = match.joiner_id
    ? match.joiner_id === user.id
      ? "You"
      : `Player ${match.joiner_id.slice(0, 8)}`
    : "Open";
  const opponentLabel = isCreator ? joinerName : creatorName;
  const isWinner = match.winner_id === user.id;

  const statusKey = (match.status as
    | "open"
    | "in_progress"
    | "completed"
    | "expired"
    | "cancelled");

  const statusConfig = {
    open: {
      color:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
      icon: faHourglass,
      label: hasUnracedRound ? "Your turn" : "Waiting for partner",
    },
    in_progress: {
      color: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
      icon: faGamepad,
      label: hasUnracedRound ? "Your turn" : "Waiting for partner",
    },
    completed: {
      color: isWinner
        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
      icon: isWinner ? faTrophy : faUserSlash,
      label: isWinner ? "You won!" : "You lost",
    },
    expired: {
      color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
      icon: faClock,
      label: "Expired",
    },
    cancelled: {
      color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
      icon: faTrash,
      label: "Cancelled",
    },
  } as const;

  const status = statusConfig[statusKey];

  const handleNavigate = () => {
    router.push(`/pvp/challenge?id=${match.id}`);
  };

  const seriesScore = `${match.creator_wins}-${match.joiner_wins}`;
  const isMultiRound = match.best_of > 1;

  if (compact) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between p-3 rounded-lg",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "hover:shadow-md transition-shadow cursor-pointer",
        )}
        onClick={handleNavigate}
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "px-2 py-1 rounded-full text-xs font-medium",
              status.color,
            )}
          >
            <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1" />
            {status.label}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            vs {opponentLabel}
            {isMultiRound && (
              <span className="ml-2 text-xs text-gray-500">{seriesScore}</span>
            )}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(match.created_at)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "p-4 rounded-xl",
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md transition-shadow",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              status.color,
            )}
          >
            <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1.5" />
            {status.label}
          </div>
          {match.status === "completed" && isWinner && (
            <FontAwesomeIcon
              icon={faCrown}
              className="w-5 h-5 text-yellow-500"
            />
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(match.created_at)}
        </span>
      </div>

      {/* Player info */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          vs {opponentLabel}
          {isMultiRound && (
            <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              {seriesScore}
            </span>
          )}
        </h3>
        {match.message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
            &ldquo;{match.message}&rdquo;
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          Level {match.level}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          {match.keyboard}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          {match.language.toUpperCase()}
        </span>
        {isMultiRound && (
          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-md text-amber-700 dark:text-amber-300">
            Best of {match.best_of}
          </span>
        )}
        {match.capital && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Capitals
          </span>
        )}
        {match.punctuation && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Punctuation
          </span>
        )}
        {match.numbers && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Numbers
          </span>
        )}
      </div>

      {/* Per-round breakdown (only when completed — both sides revealed) */}
      {match.status === "completed" && (
        <div className="space-y-2 mb-4">
          {match.rounds.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[auto_1fr_1fr] items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-xs"
            >
              <span className="text-gray-500 font-mono">R{r.round_number}</span>
              <div
                className={clsx(
                  "text-center",
                  r.winner_id === match.creator_id && "font-semibold text-green-600 dark:text-green-400",
                )}
              >
                {creatorName}: {r.creator_cpm?.toFixed(0) ?? "—"} cpm
              </div>
              <div
                className={clsx(
                  "text-center",
                  r.winner_id === match.joiner_id && "font-semibold text-green-600 dark:text-green-400",
                )}
              >
                {joinerName}: {r.joiner_cpm?.toFixed(0) ?? "—"} cpm
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!["completed", "cancelled", "expired"].includes(match.status) &&
          isParticipant &&
          hasUnracedRound && (
            <button
              data-testid="pvp-card-play"
              onClick={() => {
                startRace(match);
                router.push("/");
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
              {isMultiRound ? "Play Next Round" : "Play Now"}
            </button>
          )}

        {match.status === "open" && isCreator && (
          <button
            data-testid="pvp-card-view-link"
            onClick={handleNavigate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faGamepad} className="w-4 h-4" />
            View Link
          </button>
        )}

        {!["completed", "cancelled", "expired"].includes(match.status) &&
          isCreator &&
          !opponentHasRacedAny && (
            <button
              data-testid="pvp-card-cancel"
              onClick={async () => {
                await cancelMatch(match.id);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
              Cancel
            </button>
          )}

        {!["completed", "cancelled", "expired"].includes(match.status) &&
          isParticipant &&
          !hasUnracedRound && (
            <button
              data-testid="pvp-card-awaiting"
              onClick={handleNavigate}
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-medium cursor-default"
            >
              <FontAwesomeIcon icon={faHourglass} className="w-4 h-4" />
              Waiting for partner
            </button>
          )}

        {match.status === "completed" && (
          <button
            data-testid="pvp-card-view-results"
            onClick={handleNavigate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faTrophy} className="w-4 h-4" />
            View Results
          </button>
        )}
      </div>

      {/* Expiry warning */}
      {!["completed", "cancelled", "expired"].includes(match.status) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Expires {formatDistanceToNow(match.expires_at)}
        </p>
      )}
    </div>
  );
}
