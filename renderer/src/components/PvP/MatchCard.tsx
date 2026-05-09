"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faHourglass, faTrophy, faTrash, faSwords } from "@fortawesome/pro-duotone-svg-icons";
import { useSupabase } from "@/lib/supabase-provider";
import { usePvP, PvPMatch, PvPRound } from "@/lib/pvp-provider";

interface Props {
  match: PvPMatch;
}

export function MatchCard({ match }: Props) {
  const router = useRouter();
  const { user } = useSupabase();
  const { fetchRoundsForMatch, startRace } = usePvP();
  const [rounds, setRounds] = useState<PvPRound[]>([]);

  useEffect(() => {
    void fetchRoundsForMatch(match.id).then(setRounds);
  }, [match.id, fetchRoundsForMatch]);

  const isCreator = match.creator_id === user?.id;
  const mySlotKey: "creator" | "joiner" = isCreator ? "creator" : "joiner";
  const myWins  = isCreator ? match.creator_wins : match.joiner_wins;
  const oppWins = isCreator ? match.joiner_wins  : match.creator_wins;

  const nextUnraced = rounds.find(
    (r) => (mySlotKey === "creator" ? r.creator_completed_at : r.joiner_completed_at) === null,
  );
  const isTerminal = ["completed", "cancelled", "expired"].includes(match.status);

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <FontAwesomeIcon icon={faSwords} className="w-5 h-5 text-blue-500" />
        <span className={clsx(
          "text-xs px-2 py-1 rounded-full",
          match.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
          match.status === "in_progress" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
          match.status === "open" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
          (match.status === "cancelled" || match.status === "expired") && "bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400",
        )}>
          {match.status}
        </span>
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        Best of <strong>{match.best_of}</strong> · Score{" "}
        <strong>{myWins}</strong> – <strong>{oppWins}</strong>
      </div>

      {!isTerminal && nextUnraced && (
        <button
          data-testid="pvp-race-now"
          onClick={() => {
            startRace(match, nextUnraced);
            router.push("/");
          }}
          className="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
          Race round {nextUnraced.round_number}
        </button>
      )}

      {!isTerminal && !nextUnraced && (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <FontAwesomeIcon icon={faHourglass} className="w-4 h-4" />
          Waiting for opponent
        </div>
      )}

      {match.status === "completed" && (
        <button
          onClick={() => router.push(`/pvp/match?id=${match.id}`)}
          className="w-full px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faTrophy} className="w-4 h-4" />
          View result
        </button>
      )}
    </div>
  );
}
