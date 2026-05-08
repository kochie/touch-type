"use client";

import { PvPChallenge, usePvP } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import {
  faClock,
  faCrown,
  faGamepad,
  faHourglass,
  faPaperPlane,
  faPlay,
  faTrash,
  faTrophy,
  faUserSlash,
} from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

interface ChallengeCardProps {
  challenge: PvPChallenge;
  compact?: boolean;
}

export default function ChallengeCard({
  challenge,
  compact = false,
}: ChallengeCardProps) {
  const { user } = useSupabase();
  const { cancelChallenge } = usePvP();
  const router = useRouter();

  if (!user) return null;

  const isChallenger = challenge.challenger_id === user.id;
  const challengerName =
    challenge.challenger_id === user.id
      ? "You"
      : `Player ${challenge.challenger_id.slice(0, 8)}`;
  const opponentName =
    challenge.opponent_id && challenge.opponent_id === user.id
      ? "You"
      : challenge.opponent_id
      ? `Player ${challenge.opponent_id.slice(0, 8)}`
      : "Open";
  const displayOpponentName = isChallenger ? opponentName : challengerName;
  const isWinner = challenge.winner_id === user.id;

  const statusConfig: Record<
    PvPChallenge["status"],
    { color: string; icon: typeof faClock; label: string }
  > = {
    open: {
      color:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
      icon: faHourglass,
      label: isChallenger ? "Waiting for opponent" : "Open challenge",
    },
    claimed: {
      color:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
      icon: faGamepad,
      label:
        challenge.opponent_id === user.id && !challenge.opponent_completed_at
          ? "Your turn"
          : "Claimed",
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

  const status = statusConfig[challenge.status];

  const handleNavigate = () => {
    router.push(`/pvp/challenge?id=${challenge.id}`);
  };

  if (compact) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between p-3 rounded-lg",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "hover:shadow-md transition-shadow cursor-pointer"
        )}
        onClick={handleNavigate}
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "px-2 py-1 rounded-full text-xs font-medium",
              status.color
            )}
          >
            <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1" />
            {status.label}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            vs {displayOpponentName}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(challenge.created_at), {
            addSuffix: true,
          })}
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "p-4 rounded-xl",
        "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md transition-shadow"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              status.color
            )}
          >
            <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1.5" />
            {status.label}
          </div>
          {challenge.status === "completed" && isWinner && (
            <FontAwesomeIcon
              icon={faCrown}
              className="w-5 h-5 text-yellow-500"
            />
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(challenge.created_at), {
            addSuffix: true,
          })}
        </span>
      </div>

      {/* Opponent info */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          vs {displayOpponentName}
        </h3>
        {challenge.challenger_message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
            &ldquo;{challenge.challenger_message}&rdquo;
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          Level {challenge.level}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          {challenge.keyboard}
        </span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">
          {challenge.language.toUpperCase()}
        </span>
        {challenge.capital && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Capitals
          </span>
        )}
        {challenge.punctuation && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Punctuation
          </span>
        )}
        {challenge.numbers && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
            Numbers
          </span>
        )}
      </div>

      {/* Results (if completed) */}
      {challenge.status === "completed" && (
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div
            className={clsx(
              "text-center",
              isChallenger &&
                isWinner &&
                "ring-2 ring-green-500 rounded-lg p-2"
            )}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {challengerName}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {challenge.challenger_cpm?.toFixed(0)} CPM
            </p>
            <p className="text-xs text-gray-500">
              {challenge.challenger_correct}/
              {(challenge.challenger_correct || 0) +
                (challenge.challenger_incorrect || 0)}{" "}
              correct
            </p>
          </div>
          <div
            className={clsx(
              "text-center",
              !isChallenger &&
                isWinner &&
                "ring-2 ring-green-500 rounded-lg p-2"
            )}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {opponentName}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {challenge.opponent_cpm?.toFixed(0)} CPM
            </p>
            <p className="text-xs text-gray-500">
              {challenge.opponent_correct}/
              {(challenge.opponent_correct || 0) +
                (challenge.opponent_incorrect || 0)}{" "}
              correct
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {challenge.status === "claimed" && challenge.opponent_id === user?.id && !challenge.opponent_completed_at && (
          <button
            data-testid="pvp-card-continue"
            onClick={() => router.push(`/pvp/race?id=${challenge.id}`)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
            Continue Race
          </button>
        )}

        {challenge.status === "open" && challenge.challenger_id === user?.id && (
          <>
            <button
              data-testid="pvp-card-view-link"
              onClick={() => router.push(`/pvp/challenge?id=${challenge.id}`)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
              View Link
            </button>
            <button
              data-testid="pvp-card-cancel"
              onClick={async () => {
                await cancelChallenge(challenge.id);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
              Cancel
            </button>
          </>
        )}

        {challenge.status === "completed" && (
          <button
            data-testid="pvp-card-view-results"
            onClick={() => router.push(`/pvp/challenge?id=${challenge.id}`)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faTrophy} className="w-4 h-4" />
            View Results
          </button>
        )}
      </div>

      {/* Expiry warning */}
      {challenge.status === "open" && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Expires{" "}
          {formatDistanceToNow(new Date(challenge.expires_at), {
            addSuffix: true,
          })}
        </p>
      )}
    </div>
  );
}
