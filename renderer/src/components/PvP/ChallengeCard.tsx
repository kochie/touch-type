"use client";

import { PvPGame, usePvP } from "@/lib/pvp-provider";
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
  game: PvPGame;
  compact?: boolean;
}

export default function ChallengeCard({
  game,
  compact = false,
}: ChallengeCardProps) {
  const { user } = useSupabase();
  const { cancelGame, startRace } = usePvP();
  const router = useRouter();

  if (!user) return null;

  const isCreator = game.creator_id === user.id;
  const isJoiner = game.joiner_id === user.id;
  const isParticipant = isCreator || isJoiner;

  const mySlotCompletedAt = isCreator
    ? game.creator_completed_at
    : isJoiner
      ? game.joiner_completed_at
      : null;
  const partnerSlotCompletedAt = isCreator
    ? game.joiner_completed_at
    : isJoiner
      ? game.creator_completed_at
      : null;

  const creatorName =
    game.creator_id === user.id
      ? "You"
      : `Player ${game.creator_id.slice(0, 8)}`;
  const joinerName = game.joiner_id
    ? game.joiner_id === user.id
      ? "You"
      : `Player ${game.joiner_id.slice(0, 8)}`
    : "Open";
  // From the perspective of `user`, the OTHER side of the table.
  const opponentLabel = isCreator ? joinerName : creatorName;
  const isWinner = game.winner_id === user.id;

  const statusConfig: Record<
    PvPGame["status"],
    { color: string; icon: typeof faClock; label: string }
  > = {
    open: {
      color:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
      icon: faHourglass,
      label:
        mySlotCompletedAt === null
          ? "Your turn"
          : "Waiting for partner",
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
  };

  const status = statusConfig[game.status];

  const handleNavigate = () => {
    router.push(`/pvp/challenge?id=${game.id}`);
  };

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
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(game.created_at)}
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
          {game.status === "completed" && isWinner && (
            <FontAwesomeIcon
              icon={faCrown}
              className="w-5 h-5 text-yellow-500"
            />
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(game.created_at)}
        </span>
      </div>

      {/* Player info */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          vs {opponentLabel}
        </h3>
        {game.message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
            &ldquo;{game.message}&rdquo;
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          Level {game.level}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          {game.keyboard}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          {game.language.toUpperCase()}
        </span>
        {game.capital && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Capitals
          </span>
        )}
        {game.punctuation && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Punctuation
          </span>
        )}
        {game.numbers && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Numbers
          </span>
        )}
      </div>

      {/* Results (only when completed — both sides revealed at once) */}
      {game.status === "completed" && (
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div
            className={clsx(
              "text-center",
              game.winner_id === game.creator_id &&
                "ring-2 ring-green-500 rounded-lg p-2",
            )}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {creatorName}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {game.creator_cpm?.toFixed(0) ?? "—"} CPM
            </p>
            <p className="text-xs text-gray-500">
              {game.creator_correct ?? 0}/
              {(game.creator_correct || 0) + (game.creator_incorrect || 0)}{" "}
              correct
            </p>
          </div>
          <div
            className={clsx(
              "text-center",
              game.winner_id === game.joiner_id &&
                "ring-2 ring-green-500 rounded-lg p-2",
            )}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {joinerName}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {game.joiner_cpm?.toFixed(0) ?? "—"} CPM
            </p>
            <p className="text-xs text-gray-500">
              {game.joiner_correct ?? 0}/
              {(game.joiner_correct || 0) + (game.joiner_incorrect || 0)}{" "}
              correct
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {game.status === "open" && isParticipant && mySlotCompletedAt === null && (
          <button
            data-testid="pvp-card-play"
            onClick={() => {
              startRace(game);
              router.push("/");
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
            Play Now
          </button>
        )}

        {game.status === "open" && isCreator && (
          <button
            data-testid="pvp-card-view-link"
            onClick={handleNavigate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faGamepad} className="w-4 h-4" />
            View Link
          </button>
        )}

        {game.status === "open" &&
          isCreator &&
          partnerSlotCompletedAt === null && (
            <button
              data-testid="pvp-card-cancel"
              onClick={async () => {
                await cancelGame(game.id);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
              Cancel
            </button>
          )}

        {game.status === "open" &&
          isParticipant &&
          mySlotCompletedAt !== null && (
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

        {game.status === "completed" && (
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
      {game.status === "open" && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Expires{" "}
          {formatDistanceToNow(game.expires_at)}
        </p>
      )}
    </div>
  );
}
