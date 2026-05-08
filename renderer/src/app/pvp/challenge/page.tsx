"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PvPGame, usePvP } from "@/lib/pvp-provider";
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
} from "@fortawesome/pro-duotone-svg-icons";
import { toast } from "sonner";
import clsx from "clsx";

function ChallengePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { fetchById, cancelGame, startRace } = usePvP();

  const id = searchParams.get("id");
  const [game, setGame] = useState<PvPGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError("Invalid game ID");
        setIsLoading(false);
        return;
      }
      const g = await fetchById(id);
      if (cancelled) return;
      if (!g) setError("Game not found");
      else setGame(g);
      setIsLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, fetchById]);

  const handleCopyLink = async () => {
    if (!game) return;
    const link = `touchtyper://pvp/invite/${game.invite_code}`;
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

  if (error || !game) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <FontAwesomeIcon
          icon={faExclamationTriangle}
          className="w-8 h-8 text-red-500 mb-3"
        />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {error ?? "Game not found"}
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

  const isCreator = game.creator_id === user?.id;
  const isJoiner = game.joiner_id === user?.id;
  const isParticipant = isCreator || isJoiner;

  if (!isParticipant) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Access denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You aren&apos;t a participant in this game. If a friend shared the
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

  const mySlotCompletedAt = isCreator
    ? game.creator_completed_at
    : game.joiner_completed_at;
  const partnerSlotCompletedAt = isCreator
    ? game.joiner_completed_at
    : game.creator_completed_at;

  // Cancelled / expired — terminal.
  if (game.status === "cancelled" || game.status === "expired") {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Game {game.status}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This game is no longer playable.
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

  // Completed — both sides revealed.
  if (game.status === "completed") {
    const winner = game.winner_id;
    const winnerLabel =
      winner === user?.id
        ? "You won!"
        : winner === null
          ? "It's a tie"
          : "You lost";
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={clsx(
              "p-4 rounded-xl text-center",
              winner === game.creator_id
                ? "bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-500"
                : "bg-gray-50 dark:bg-gray-900/50",
            )}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {game.creator_id === user?.id ? "You" : "Creator"}
            </p>
            <p className="text-3xl font-bold">
              {game.creator_cpm !== null ? Math.round(game.creator_cpm) : "—"}
            </p>
            <p className="text-xs text-gray-500">CPM</p>
            <p className="text-xs text-gray-500 mt-2">
              {game.creator_correct ?? 0}/
              {(game.creator_correct ?? 0) + (game.creator_incorrect ?? 0)}{" "}
              correct
            </p>
          </div>
          <div
            className={clsx(
              "p-4 rounded-xl text-center",
              winner === game.joiner_id
                ? "bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-500"
                : "bg-gray-50 dark:bg-gray-900/50",
            )}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {game.joiner_id === user?.id ? "You" : "Joiner"}
            </p>
            <p className="text-3xl font-bold">
              {game.joiner_cpm !== null ? Math.round(game.joiner_cpm) : "—"}
            </p>
            <p className="text-xs text-gray-500">CPM</p>
            <p className="text-xs text-gray-500 mt-2">
              {game.joiner_correct ?? 0}/
              {(game.joiner_correct ?? 0) + (game.joiner_incorrect ?? 0)}{" "}
              correct
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

  // game.status === 'open' — different sub-states based on who has raced
  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <div className="text-center">
        <FontAwesomeIcon
          icon={mySlotCompletedAt ? faHourglass : faPlay}
          className={clsx(
            "w-12 h-12 mb-3",
            mySlotCompletedAt
              ? "text-blue-500 animate-pulse"
              : "text-yellow-500",
          )}
        />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mySlotCompletedAt
            ? "Waiting for the other player"
            : "Your race awaits"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {mySlotCompletedAt
            ? partnerSlotCompletedAt
              ? "Loading results…"
              : "We'll show you the result once they finish their race."
            : "Pick your moment — you can race now or come back later. The other side won't see your score until they finish theirs."}
        </p>
      </div>

      {/* Invite link (creators only) */}
      {isCreator && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
            Invite Link
          </p>
          <div className="flex items-center gap-2">
            <code
              data-testid="pvp-invite-link"
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-md text-sm font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 break-all select-all"
            >
              {`touchtyper://pvp/invite/${game.invite_code}`}
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
          {!game.joiner_id && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Share this with one person — first to use it claims the second
              slot.
            </p>
          )}
        </div>
      )}

      {/* Play / Cancel buttons */}
      <div className="space-y-3">
        {!mySlotCompletedAt && (
          <button
            data-testid="pvp-play-now"
            onClick={() => {
              startRace(game);
              router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
            Play Now
          </button>
        )}

        {isCreator && !partnerSlotCompletedAt && (
          <button
            data-testid="pvp-cancel-game"
            onClick={async () => {
              if (await cancelGame(game.id)) router.push("/pvp");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            Cancel Game
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
