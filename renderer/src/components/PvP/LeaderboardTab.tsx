"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase-provider";
import { useSettings } from "@/lib/settings_hook";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinnerThird, faTrophy } from "@fortawesome/pro-duotone-svg-icons";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { formatDuration } from "@/lib/duration-utils";
import { keyboards } from "@/components/KeyboardSelect";
import { levels } from "@/components/settings/settings";
import { LANGUAGES } from "@/lib/languages";
import { KeyboardLayoutNames } from "@/keyboards";
import { Levels, Languages } from "@/lib/settings_hook";
import clsx from "clsx";
import { formatDistanceToNow } from "@/lib/relative-time";
import { AvatarComposite } from "@/components/avatars/AvatarComposite";

interface LeaderboardScore {
  user_id: string;
  username: string;
  time: number;
  correct: number;
  incorrect: number;
  datetime: string;
  cpm: number;
  level: string;
  keyboard: string;
  language: string | null;
  equipped_face: string | null;
  equipped_hat: string | null;
}

interface UserRankRow {
  rank: number;
  username: string;
  cpm: number;
  correct: number;
  incorrect: number;
  time: number;
  datetime: string;
  equipped_face: string | null;
  equipped_hat: string | null;
}

const rankColor = (rank: number) => {
  if (rank === 1) return "text-amber-400";
  if (rank === 2) return "text-slate-300";
  if (rank === 3) return "text-amber-700";
  return "text-slate-600";
};

const selectClass =
  "appearance-none bg-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 pr-7 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer *:text-black";

const COLS = "grid-cols-[2rem_2.25rem_1fr_5rem_5rem_5rem_9rem]";

function ScoreRow({
  rank,
  score,
  highlight,
}: {
  rank: number;
  score: {
    username: string;
    cpm: number;
    correct: number;
    incorrect: number;
    time: number;
    datetime: string;
    equipped_face: string | null;
    equipped_hat: string | null;
  };
  highlight?: boolean;
}) {
  const total = score.correct + score.incorrect;
  const accuracy = total > 0 ? (score.correct / total) * 100 : 0;
  const cpm = Number.isFinite(score.cpm) ? score.cpm : score.correct / (score.time / 1000 / 60);
  const duration = Temporal.Duration.from({ milliseconds: score.time });

  return (
    <div
      className={clsx(
        `grid ${COLS} gap-2 px-4 py-3 items-center border-b border-slate-700/30 last:border-0`,
        highlight
          ? "bg-sky-500/10 border-l-2 border-l-sky-500"
          : rank <= 3
          ? "bg-slate-800/20"
          : "hover:bg-slate-800/20 transition-colors",
      )}
    >
      <span className={clsx("text-sm font-bold tabular-nums", rankColor(rank))}>{rank}</span>
      <AvatarComposite face={score.equipped_face ?? "classic"} hat={score.equipped_hat} size={28} />
      <span className={clsx("text-sm font-medium truncate", highlight ? "text-sky-300" : "text-slate-200")}>
        {score.username}
        {highlight && <span className="ml-1.5 text-[10px] text-sky-500 font-semibold uppercase tracking-wide">you</span>}
      </span>
      <span className="text-sm font-bold tabular-nums text-sky-400 text-right">
        {Number.isFinite(cpm) ? cpm.toFixed(0) : "—"}
      </span>
      <span className="text-sm tabular-nums text-slate-300 text-right">{accuracy.toFixed(1)}%</span>
      <span className="text-xs tabular-nums text-slate-400 text-right font-mono">
        {formatDuration(duration, score.time >= 60_000 ? "m:ss" : "s.S")}s
      </span>
      <span className="text-[11px] text-slate-500 text-right truncate">
        {formatDistanceToNow(score.datetime)}
      </span>
    </div>
  );
}

function ModifierToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
        active
          ? "bg-sky-500/15 border-sky-500/50 text-sky-300"
          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200",
      )}
    >
      {label}
    </button>
  );
}

export default function LeaderboardTab() {
  const { supabase, user } = useSupabase();
  const settings = useSettings();

  const [keyboard, setKeyboard] = useState<KeyboardLayoutNames>(settings.keyboardName);
  const [level, setLevel] = useState<Levels>(settings.levelName);
  const [language, setLanguage] = useState<Languages>(settings.language);
  const [capital, setCapital] = useState<boolean>(!!settings.capital);
  const [punctuation, setPunctuation] = useState<boolean>(!!settings.punctuation);
  const [numbers, setNumbers] = useState<boolean>(!!settings.numbers);

  const [scores, setScores] = useState<LeaderboardScore[]>([]);
  const [userRank, setUserRank] = useState<UserRankRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      setUserRank(null);

      try {
        // Top 50
        const { data, error: err } = await supabase
          .from("leaderboard_scores")
          .select("user_id, username, time, correct, incorrect, datetime, cpm, level, keyboard, language, equipped_face, equipped_hat")
          .eq("keyboard", keyboard)
          .eq("level", level)
          .eq("language", language)
          .eq("capital", capital)
          .eq("punctuation", punctuation)
          .eq("numbers", numbers)
          .order("cpm", { ascending: false })
          .limit(50);

        if (cancelled) return;
        if (err) throw err;

        const top50 = data ?? [];
        setScores(top50);

        // If the user is logged in and not in the top 50, fetch their rank.
        if (user && !top50.some((s) => s.user_id === user.id)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rankData } = await (supabase as any).rpc("get_user_leaderboard_rank", {
            p_user_id:     user.id,
            p_keyboard:    keyboard,
            p_level:       level,
            p_language:    language,
            p_capital:     capital,
            p_punctuation: punctuation,
            p_numbers:     numbers,
          });
          if (!cancelled && Array.isArray(rankData) && rankData.length > 0) {
            setUserRank(rankData[0] as UserRankRow);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load leaderboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [keyboard, level, language, capital, punctuation, numbers, supabase, user]);

  const userInTop50 = user ? scores.findIndex((s) => s.user_id === user.id) : -1;

  return (
    <div className="flex flex-col gap-4">
      {/* Scoring explainer */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3 text-xs text-slate-400 leading-relaxed">
        Ranked by <span className="text-sky-300 font-semibold">net CPM</span> — correct characters per minute.
        Typos don&apos;t count toward speed, so accuracy is built into the rank.
        Each difficulty combination (level, keyboard, language, caps/punct/nums) has its own board;
        a higher score on the selected combination replaces your previous best.
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mr-1">Filter</span>

        <div className="relative">
          <select value={level} onChange={(e) => setLevel(e.target.value as Levels)} className={selectClass}>
            {levels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select value={keyboard} onChange={(e) => setKeyboard(e.target.value as KeyboardLayoutNames)} className={selectClass}>
            {keyboards.map((kb) => <option key={kb.layout} value={kb.layout}>{kb.country} {kb.name}</option>)}
          </select>
          <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select value={language} onChange={(e) => setLanguage(e.target.value as Languages)} className={selectClass}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <FontAwesomeIcon icon={faChevronDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 pointer-events-none" />
        </div>

        <ModifierToggle label="Caps"  active={capital}     onClick={() => setCapital(v => !v)} />
        <ModifierToggle label="Punct" active={punctuation} onClick={() => setPunctuation(v => !v)} />
        <ModifierToggle label="Nums"  active={numbers}     onClick={() => setNumbers(v => !v)} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <FontAwesomeIcon icon={faSpinnerThird} spin className="w-7 h-7 text-slate-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 py-6 text-center">{error}</p>
      ) : scores.length === 0 && !userRank ? (
        <div className="py-12 text-center">
          <FontAwesomeIcon icon={faTrophy} className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">No scores for these settings yet</p>
          <p className="text-xs text-slate-600 mt-1">Be the first to set a record</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className={`grid ${COLS} gap-2 px-4 py-2 bg-slate-800/60 border-b border-slate-700/50`}>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">#</span>
            <span />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Player</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 text-right">Net CPM</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 text-right">Accuracy</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 text-right">Time</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 text-right">When</span>
          </div>

          {/* Top 50 rows */}
          {scores.map((score, i) => (
            <ScoreRow
              key={`${score.user_id}-${score.datetime}`}
              rank={i + 1}
              score={score}
              highlight={i === userInTop50}
            />
          ))}

          {/* User outside top 50 */}
          {userRank && (
            <>
              <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/60 border-b border-slate-700/30">
                <div className="flex-1 border-t border-dashed border-slate-700/60" />
                <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest flex-shrink-0">
                  your best
                </span>
                <div className="flex-1 border-t border-dashed border-slate-700/60" />
              </div>
              <ScoreRow rank={userRank.rank} score={userRank} highlight />
            </>
          )}
        </div>
      )}
    </div>
  );
}
