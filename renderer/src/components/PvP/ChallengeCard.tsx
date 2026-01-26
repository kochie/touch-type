"use client";

import {
  PvPChallenge,
  getChallengeDisplayName,
  hasUserCompleted,
  isUsersTurn,
  usePvP,
} from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import {
  faCheck,
  faClock,
  faCrown,
  faGamepad,
  faHourglass,
  faPlay,
  faTimes,
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
  const { acceptChallenge, declineChallenge, cancelChallenge } = usePvP();
  const router = useRouter();

  if (!user) return null;

  const isChallenger = challenge.challenger_id === user.id;
  const isOpponent = challenge.opponent_id === user.id;
  const opponentName = isChallenger
    ? getChallengeDisplayName(challenge, "opponent")
    : getChallengeDisplayName(challenge, "challenger");
  const userCompleted = hasUserCompleted(challenge, user.id);
  const canPlay = isUsersTurn(challenge, user.id);
  const isWinner = challenge.winner_id === user.id;

  const statusConfig = {
    pending: {
      color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
      icon: faHourglass,
      label: isChallenger ? "Waiting for opponent" : "Challenge received",
    },
    accepted: {
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      icon: faPlay,
      label: "Ready to play",
    },
    in_progress: {
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
      icon: faGamepad,
      label: userCompleted ? "Waiting for opponent" : "Your turn",
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
    declined: {
      color: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
      icon: faTimes,
      label: "Declined",
    },
  };

  const status = statusConfig[challenge.status];

  const handlePlay = () => {
    router.push(`/pvp/${challenge.id}`);
  };

  const handleAccept = async () => {
    await acceptChallenge(challenge.id);
  };

  const handleDecline = async () => {
    await declineChallenge(challenge.id);
  };

  const handleCancel = async () => {
    await cancelChallenge(challenge.id);
  };

  const handleViewResults = () => {
    router.push(`/pvp/${challenge.id}`);
  };

  if (compact) {
    return (
      <div
        className={clsx(
          "flex items-center justify-between p-3 rounded-lg",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "hover:shadow-md transition-shadow cursor-pointer"
        )}
        onClick={handlePlay}
      >
        <div className="flex items-center gap-3">
          <div className={clsx("px-2 py-1 rounded-full text-xs font-medium", status.color)}>
            <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1" />
            {status.label}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            vs {opponentName}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(challenge.created_at), { addSuffix: true })}
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
          <div className={clsx("px-2.5 py-1 rounded-full text-xs font-medium", status.color)}>
            <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1.5" />
            {status.label}
          </div>
          {challenge.status === "completed" && isWinner && (
            <FontAwesomeIcon icon={faCrown} className="w-5 h-5 text-yellow-500" />
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(challenge.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Opponent info */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          vs {opponentName}
        </h3>
        {challenge.message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
            "{challenge.message}"
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
          <div className={clsx("text-center", isChallenger && isWinner && "ring-2 ring-green-500 rounded-lg p-2")}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isChallenger ? "You" : challenge.challenger_username}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {challenge.challenger_cpm?.toFixed(0)} CPM
            </p>
            <p className="text-xs text-gray-500">
              {challenge.challenger_correct}/{(challenge.challenger_correct || 0) + (challenge.challenger_incorrect || 0)} correct
            </p>
          </div>
          <div className={clsx("text-center", !isChallenger && isWinner && "ring-2 ring-green-500 rounded-lg p-2")}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {!isChallenger ? "You" : challenge.opponent_username}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {challenge.opponent_cpm?.toFixed(0)} CPM
            </p>
            <p className="text-xs text-gray-500">
              {challenge.opponent_correct}/{(challenge.opponent_correct || 0) + (challenge.opponent_incorrect || 0)} correct
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {challenge.status === "pending" && isOpponent && (
          <>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
              Decline
            </button>
          </>
        )}

        {challenge.status === "pending" && isChallenger && (
          <button
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            Cancel Challenge
          </button>
        )}

        {canPlay && (
          <button
            onClick={handlePlay}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
            Play Now
          </button>
        )}

        {challenge.status === "in_progress" && userCompleted && (
          <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg">
            <FontAwesomeIcon icon={faHourglass} className="w-4 h-4 animate-pulse" />
            Waiting for opponent...
          </div>
        )}

        {challenge.status === "completed" && (
          <button
            onClick={handleViewResults}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faTrophy} className="w-4 h-4" />
            View Results
          </button>
        )}
      </div>

      {/* Expiry warning */}
      {challenge.status === "pending" && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          Expires {formatDistanceToNow(new Date(challenge.expires_at), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
