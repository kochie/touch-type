"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PvPMatch, PvPRound, usePvP } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner, faExclamationTriangle, faLink, faTrophy,
  faHourglass, faTrash, faPlay, faSwords,
} from "@fortawesome/pro-duotone-svg-icons";
import { toast } from "sonner";
import clsx from "clsx";

function MatchPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { fetchById, fetchRoundsForMatch, cancelMatch, startRace } = usePvP();

  const id = params.get("id");
  const [match, setMatch] = useState<PvPMatch | null>(null);
  const [rounds, setRounds] = useState<PvPRound[]>([]);
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
      const [m, rs] = await Promise.all([fetchById(id), fetchRoundsForMatch(id)]);
      if (cancelled) return;
      if (!m) setError("Match not found");
      else {
        setMatch(m);
        setRounds(rs);
      }
      setIsLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [id, fetchById, fetchRoundsForMatch]);

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
        <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }
  if (error || !match) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">{error ?? "Match not found"}</h2>
        <button onClick={() => router.push("/pvp")} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
          Back to PvP
        </button>
      </div>
    );
  }

  const isCreator = match.creator_id === user?.id;
  const isJoiner  = match.joiner_id === user?.id;
  if (!isCreator && !isJoiner) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold mb-2">Access denied</h2>
        <p className="text-gray-600 mb-6">
          You aren&apos;t a participant. If a friend shared a link, open it directly to join.
        </p>
        <button onClick={() => router.push("/pvp")} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
          Back to PvP
        </button>
      </div>
    );
  }

  const mySlotKey: "creator" | "joiner" = isCreator ? "creator" : "joiner";
  const nextUnraced = rounds.find(
    (r) => (mySlotKey === "creator" ? r.creator_completed_at : r.joiner_completed_at) === null,
  );
  const isTerminal = ["completed", "cancelled", "expired"].includes(match.status);
  const noSubmissions = rounds.every(
    (r) => r.creator_completed_at === null && r.joiner_completed_at === null,
  );

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-6">
      <div className="text-center">
        <FontAwesomeIcon icon={match.status === "completed" ? faTrophy : faSwords} className="w-12 h-12 text-blue-500 mb-3" />
        <h2 className="text-3xl font-bold">
          {match.status === "completed"
            ? match.winner_id === user?.id ? "You won!" : "You lost"
            : `Best of ${match.best_of}`}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
          Score {match.creator_wins} – {match.joiner_wins}
        </p>
      </div>

      {/* Per-round grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rounds.map((r) => {
          const myDone  = (mySlotKey === "creator" ? r.creator_completed_at : r.joiner_completed_at) !== null;
          const oppDone = (mySlotKey === "creator" ? r.joiner_completed_at  : r.creator_completed_at) !== null;
          const resolved = r.winner_id !== null;
          return (
            <div key={r.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Round {r.round_number}</span>
                {resolved && (
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full",
                    r.winner_id === user?.id ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                              : "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300")}>
                    {r.winner_id === user?.id ? "Won" : "Lost"}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                You: {myDone  ? "✓ submitted" : "—"}<br/>
                Opp: {oppDone ? "✓ submitted" : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Invite link (creators only) */}
      {isCreator && match.status !== "completed" && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-500 mb-2 text-center">Invite Link</p>
          <div className="flex items-center gap-2">
            <code data-testid="pvp-invite-link" className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700 break-all select-all">
              {`touchtyper://pvp/invite/${match.invite_code}`}
            </code>
            <button onClick={handleCopyLink} aria-label="Copy invite link" className="p-2 text-gray-500 hover:text-gray-700">
              <FontAwesomeIcon icon={faLink} className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary action */}
      {!isTerminal && nextUnraced && (
        <button
          data-testid="pvp-race-now"
          onClick={() => { startRace(match, nextUnraced); router.push("/"); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white"
        >
          <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
          Race round {nextUnraced.round_number}
        </button>
      )}
      {!isTerminal && !nextUnraced && (
        <p className="text-center text-gray-500 flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faHourglass} className="w-4 h-4" />
          Waiting for opponent
        </p>
      )}

      {/* Cancel (creator only, while no submissions) */}
      {isCreator && !isTerminal && noSubmissions && (
        <button
          data-testid="pvp-cancel-match"
          onClick={async () => {
            if (await cancelMatch(match.id)) router.push("/pvp");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          Cancel match
        </button>
      )}

      <button onClick={() => router.push("/pvp")} className="w-full px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
        Back to PvP
      </button>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <MatchPageInner />
    </Suspense>
  );
}
