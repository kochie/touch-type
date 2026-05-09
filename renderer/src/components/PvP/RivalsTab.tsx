"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo, faTrophy } from "@fortawesome/pro-duotone-svg-icons";
import { usePvP, PvPRivalRow } from "@/lib/pvp-provider";

export function RivalsTab() {
  const router = useRouter();
  const { listRivals } = usePvP();
  const [rivals, setRivals] = useState<PvPRivalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void listRivals().then((rows) => {
      if (!cancelled) {
        setRivals(rows);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [listRivals]);

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-4">Loading rivals…</p>;
  }
  if (rivals.length === 0) {
    return (
      <p data-testid="pvp-no-rivals" className="text-sm text-gray-500 py-8 text-center">
        No rivals yet. Finish a match to see them here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rivals.map((rival) => (
        <div
          key={rival.rival_id}
          data-testid="pvp-rival-row"
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {rival.rival_id.slice(0, 8)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <FontAwesomeIcon icon={faTrophy} className="w-3 h-3" />
              {rival.matches_won} – {rival.matches_lost}
              <span className="ml-1">({rival.matches_played} played)</span>
            </p>
          </div>
          <button
            data-testid="pvp-rematch"
            onClick={() => router.push(`/pvp?tab=new&rivalId=${rival.rival_id}&fromMatchId=${rival.last_match_id}`)}
            className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faRedo} className="w-4 h-4" />
            Rematch
          </button>
        </div>
      ))}
    </div>
  );
}
