"use client";

import { usePvP } from "@/lib/pvp-provider";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag, faSwords } from "@fortawesome/pro-duotone-svg-icons";

// Persistent in-race chrome rendered alongside the top nav. Living outside
// the centered practice area means it can't push the typing UI off-screen
// — the previous Tracker-internal banner did exactly that on a viewport
// that was already at its vertical limit.
export default function PvPBanner() {
  const { currentRace, exitRace } = usePvP();
  const router = useRouter();

  if (!currentRace) return null;

  const handleForfeit = () => {
    exitRace();
    router.push("/pvp");
  };

  const { match, round } = currentRace;
  const isMultiRound = match.best_of > 1;

  return (
    <div
      data-testid="pvp-mode-banner"
      className="flex items-center justify-between gap-4 px-4 py-2 mx-auto w-full max-w-[760px] rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-100"
    >
      <div className="flex items-center gap-2 min-w-0">
        <FontAwesomeIcon icon={faSwords} className="w-4 h-4 text-sky-400 flex-shrink-0" />
        <span className="font-semibold text-sm text-sky-300">PvP Battle</span>
        <span className="text-xs text-sky-400/70 truncate">
          {isMultiRound
            ? `Round ${round.round_number} of ${match.best_of} · playing blind`
            : "playing blind"}
        </span>
      </div>
      <button
        data-testid="pvp-forfeit"
        onClick={handleForfeit}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors duration-150 flex-shrink-0"
      >
        <FontAwesomeIcon icon={faFlag} className="w-3 h-3" />
        Exit Race
      </button>
    </div>
  );
}
