"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePvP, PvPGame } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faCheck,
  faSwords,
  faPlay,
} from "@fortawesome/pro-duotone-svg-icons";
import clsx from "clsx";

function InvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { fetchByInviteCode, joinGame, startRace } = usePvP();

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [game, setGame] = useState<PvPGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const code = searchParams.get("code");

  useEffect(() => {
    const fetchGame = async () => {
      if (!code) {
        setError("Invalid invite code");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchByInviteCode(code);
        if (data) {
          setGame(data);
        } else {
          setError("Game not found or invite has expired");
        }
      } catch (err) {
        setError("Failed to load game");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGame();
  }, [code, fetchByInviteCode]);

  const handleAccept = async () => {
    if (!user) {
      setError("Please sign in to join this game");
      return;
    }
    if (!game) return;

    setIsAccepting(true);
    try {
      // Already a participant? Skip the join call.
      const isAlreadyJoiner = game.joiner_id === user.id;
      const isCreator = game.creator_id === user.id;
      const joined =
        isAlreadyJoiner || isCreator ? game : await joinGame(game.id);
      if (joined) {
        setAccepted(true);
        startRace(joined);
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        setError("Failed to join the game");
      }
    } catch (err) {
      setError("Failed to join the game");
      console.error(err);
    } finally {
      setIsAccepting(false);
    }
  };

  // Loading state
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

  // Success state
  if (accepted) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faCheck}
            className="w-10 h-10 text-green-500"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          You're In!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to the race...
        </p>
      </div>
    );
  }

  // Error state
  if (error || !game) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="w-8 h-8 text-red-500"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {error || "Game not found"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The invite link may be invalid or expired.
        </p>
        <button
          onClick={() => router.push("/pvp")}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
            "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            "text-gray-700 dark:text-gray-300 transition-colors",
          )}
        >
          Go to PvP Hub
        </button>
      </div>
    );
  }

  const isCreator = game.creator_id === user?.id;
  const isJoiner = game.joiner_id === user?.id;
  const isParticipant = isCreator || isJoiner;

  // Already a participant — show settings + Play button.
  // Status non-open — terminal state.
  if (game.status !== "open") {
    const statusMessage =
      game.status === "completed"
        ? "This game is already completed. See History for results."
        : game.status === "cancelled"
          ? "This game was cancelled."
          : "This game has expired.";

    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="w-8 h-8 text-gray-500"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {statusMessage}
        </h2>
        <button
          onClick={() => router.push("/pvp")}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-lg font-medium",
            "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
            "text-gray-700 dark:text-gray-300 transition-colors",
          )}
        >
          Go to PvP Hub
        </button>
      </div>
    );
  }

  // Game has another joiner that isn't us — link is closed to us.
  if (game.joiner_id && !isParticipant) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="w-8 h-8 text-gray-500"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Someone else has already joined this game
        </h2>
        <button
          onClick={() => router.push("/pvp")}
          className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
        >
          Go to PvP Hub
        </button>
      </div>
    );
  }

  const buttonLabel = isParticipant ? "Play Now" : "Join & Play";
  const headerCopy = isCreator
    ? "Your Game"
    : isJoiner
      ? "Continue Your Game"
      : "You've Been Invited";
  const subCopy = isCreator
    ? "Race when you're ready — your partner can't see your time until they finish theirs."
    : isJoiner
      ? "Pick up where you left off."
      : "Join this game and race. Both sides play blind — no one sees the score until both are done.";

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faSwords}
            className="w-10 h-10 text-blue-500"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {headerCopy}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{subCopy}</p>
      </div>

      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-6">
        {game.message && (
          <p className="text-center text-gray-700 dark:text-gray-300 italic mb-4">
            &ldquo;{game.message}&rdquo;
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">
          Game Settings
        </h3>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            Level {game.level}
          </span>
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {game.keyboard}
          </span>
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {game.language.toUpperCase()}
          </span>
          <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {game.word_set.length} words
          </span>
        </div>
      </div>

      {!user && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            Please sign in to play this game
          </p>
        </div>
      )}

      <button
        data-testid="pvp-accept-invite"
        onClick={handleAccept}
        disabled={isAccepting || !user}
        className={clsx(
          "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg",
          "bg-green-500 hover:bg-green-600 text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors shadow-lg",
        )}
      >
        {isAccepting ? (
          <>
            <FontAwesomeIcon icon={faSpinner} className="w-5 h-5 animate-spin" />
            Joining…
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
            {buttonLabel}
          </>
        )}
      </button>

      <button
        onClick={() => router.push("/pvp")}
        className={clsx(
          "w-full mt-3 px-4 py-2 rounded-lg font-medium text-center",
          "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
          "transition-colors",
        )}
      >
        Decline
      </button>
    </div>
  );
}

export default function InvitePage() {
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
      <InvitePageInner />
    </Suspense>
  );
}
