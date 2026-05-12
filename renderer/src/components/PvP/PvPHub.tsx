"use client";

import { usePvP, type PvPGame } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import {
  faHistory,
  faPlus,
  faSwords,
  faSpinnerThird,
  faUserSlash,
} from "@fortawesome/pro-duotone-svg-icons";
import { faXmark, faPencil } from "@fortawesome/pro-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import NewChallengePrompt from "./NewChallengePrompt";
import PageHeader from "@/components/PageHeader";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlan } from "@/lib/plan_hook";
import { AvatarComposite } from "@/components/avatars/AvatarComposite";
import { AvatarPicker } from "@/components/avatars/AvatarPicker";
import Link from "next/link";

type TabId = "challenges" | "history";

// ── Game row ─────────────────────────────────────────────────────────────────

interface ArenaGameRowProps {
  game: PvPGame;
  userId: string;
  usernameMap: Record<string, string>;
  avatarMap: Record<string, { face: string; hat: string | null }>;
}

function ArenaGameRow({ game, userId, usernameMap, avatarMap }: ArenaGameRowProps) {
  const router = useRouter();
  const { startRace } = usePvP();

  const isCreator = game.creator_id === userId;
  const opponentId = isCreator ? (game.joiner_id ?? "") : game.creator_id;
  const opponentName = usernameMap[opponentId] ?? (opponentId ? opponentId.slice(0, 8) : "Open");
  const opponentAvatar = avatarMap[opponentId] ?? { face: "classic", hat: null };

  const myCompleted = isCreator ? game.creator_completed_at : game.joiner_completed_at;
  const myCpm = isCreator ? game.creator_cpm : game.joiner_cpm;
  const isWinner = game.winner_id === userId;

  // Determine display status for this user
  let statusLabel: string;
  let statusClass: string;
  if (game.status === "completed") {
    const cpmStr = myCpm != null ? ` · ${myCpm.toFixed(0)} CPM` : "";
    statusLabel = isWinner ? `WON${cpmStr}` : `LOST${cpmStr}`;
    statusClass = isWinner
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
      : "bg-slate-700/60 text-slate-400 border border-slate-600/40";
  } else if (game.status === "open" && myCompleted === null) {
    statusLabel = "IN PROGRESS";
    statusClass = "bg-sky-500/15 text-sky-400 border border-sky-500/25";
  } else {
    statusLabel = "WAITING";
    statusClass = "bg-amber-500/15 text-amber-400 border border-amber-500/25";
  }

  const wordCount = game.word_set.length;
  const langLabel = game.language.charAt(0).toUpperCase() + game.language.slice(1);
  const levelLabel = `Level ${game.level}`;

  const handleClick = () => {
    if (game.status === "open" && myCompleted === null) {
      startRace(game);
      router.push("/");
    } else {
      router.push(`/pvp/challenge?id=${game.id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-150 text-left"
    >
      <AvatarComposite face={opponentAvatar.face} hat={opponentAvatar.hat} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{opponentName}</p>
        <p className="text-xs text-slate-500">{wordCount} words · {langLabel} · {levelLabel}</p>
      </div>
      <span className={clsx("flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full", statusClass)}>
        {statusLabel}
      </span>
    </button>
  );
}

// ── Stat cards ────────────────────────────────────────────────────────────────

interface RecordCardProps {
  wins: number;
  played: number;
}

function RecordCard({ wins, played }: RecordCardProps) {
  const rate = played > 0 ? wins / played : 0;
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 px-5 py-4 flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Your Record</p>
      <p className="text-4xl font-bold text-sky-400 tabular-nums">{wins}</p>
      <p className="text-sm text-slate-400">wins / {played} played</p>
      <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-sky-400 rounded-full transition-all duration-500"
          style={{ width: `${rate * 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{played > 0 ? `${(rate * 100).toFixed(0)}% win rate` : "No games yet"}</p>
    </div>
  );
}

interface BestCpmCardProps {
  cpm: number | null;
  opponentName: string | null;
  at: string | null;
}

function BestCpmCard({ cpm, opponentName, at }: BestCpmCardProps) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 px-5 py-4 flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Best CPM in Arena</p>
      {cpm != null ? (
        <>
          <p className="text-4xl font-bold text-amber-400 tabular-nums">{cpm.toFixed(0)}</p>
          <p className="text-xs text-slate-500">
            {opponentName ? `vs ${opponentName}` : ""}
            {at ? ` · ${formatDistanceToNow(new Date(at), { addSuffix: true })}` : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-500">Complete a game to set a record</p>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function PvPHub() {
  const [activeTab, setActiveTab] = useState<TabId>("challenges");
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const { user, isLoading: isUserLoading, supabase } = useSupabase();
  const { myActiveGames, myAwaitingGames, myCompletedGames, isLoading } = usePvP();
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});

  const plan = usePlan();
  const isPremium = plan?.billing_plan === "premium";

  const [avatarMap, setAvatarMap] = useState<Record<string, { face: string; hat: string | null }>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myFace, setMyFace] = useState("classic");
  const [myHat, setMyHat] = useState<string | null>(null);

  const allGames = useMemo(() => [...myActiveGames, ...myAwaitingGames, ...myCompletedGames], [myActiveGames, myAwaitingGames, myCompletedGames]);
  const challengeGames = useMemo(() => [...myActiveGames, ...myAwaitingGames], [myActiveGames, myAwaitingGames]);
  const historyGames = useMemo(() => myCompletedGames, [myCompletedGames]);

  // Fetch own avatar on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("equipped_face, equipped_hat")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setMyFace(data.equipped_face ?? "classic");
        setMyHat(data.equipped_hat ?? null);
      });
  }, [user, supabase]);

  // Batch-fetch opponent usernames and avatars
  useEffect(() => {
    if (!user || allGames.length === 0) return;
    const ids = [...new Set(
      allGames.flatMap(g => [g.creator_id, g.joiner_id].filter((id): id is string => !!id && id !== user.id))
    )];
    if (ids.length === 0) return;
    supabase
      .from("profiles")
      .select("id, preferred_username, name, equipped_face, equipped_hat")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const names: Record<string, string> = {};
        const avatars: Record<string, { face: string; hat: string | null }> = {};
        for (const p of data) {
          names[p.id] = p.preferred_username || p.name || p.id.slice(0, 8);
          avatars[p.id] = {
            face: p.equipped_face ?? "classic",
            hat: p.equipped_hat ?? null,
          };
        }
        setUsernameMap(names);
        setAvatarMap(avatars);
      });
  }, [allGames, user, supabase]);

  const saveAvatar = useCallback(
    async (face: string, hat: string | null) => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ equipped_face: face, equipped_hat: hat })
        .eq("id", user.id);
      if (error) {
        toast.error("Failed to save avatar");
        throw error;
      }
    },
    [user, supabase],
  );

  const handleFaceChange = useCallback(
    (slug: string) => {
      const prev = myFace;
      setMyFace(slug);
      saveAvatar(slug, myHat).catch(() => setMyFace(prev));
    },
    [myFace, myHat, saveAvatar],
  );

  const handleHatChange = useCallback(
    (slug: string | null) => {
      const prev = myHat;
      setMyHat(slug);
      saveAvatar(myFace, slug).catch(() => setMyHat(prev));
    },
    [myFace, myHat, saveAvatar],
  );

  // Stats from completed games
  const completedOnly = useMemo(
    () => myCompletedGames.filter((g) => g.status === "completed"),
    [myCompletedGames],
  );
  const wins = user ? completedOnly.filter(g => g.winner_id === user.id).length : 0;

  const { bestCpm, bestCpmGame } = useMemo(() => {
    if (!user) return { bestCpm: null, bestCpmGame: null };
    let best: number | null = null;
    let bestGame: PvPGame | null = null;
    for (const g of completedOnly) {
      const myCpm = g.creator_id === user.id ? g.creator_cpm : g.joiner_cpm;
      if (myCpm != null && (best === null || myCpm > best)) {
        best = myCpm;
        bestGame = g;
      }
    }
    return { bestCpm: best, bestCpmGame: bestGame };
  }, [completedOnly, user]);

  const bestCpmOpponent = useMemo(() => {
    if (!bestCpmGame || !user) return null;
    const opponentId = bestCpmGame.creator_id === user.id ? bestCpmGame.joiner_id : bestCpmGame.creator_id;
    return opponentId ? (usernameMap[opponentId] ?? opponentId.slice(0, 8)) : null;
  }, [bestCpmGame, user, usernameMap]);

  if (!isUserLoading && !user) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-center py-20">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <FontAwesomeIcon icon={faUserSlash} className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-lg font-semibold text-slate-300">Sign in to play Arena</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "challenges", label: "Challenges", badge: myActiveGames.length },
    { id: "history", label: "History" },
  ];

  return (
    <div className="flex flex-col overflow-y-auto">
      <PageHeader
        icon={faSwords}
        title="Arena"
        subtitle="Challenge friends and climb the leaderboard"
        iconBg="bg-amber-400/10"
        iconColor="text-amber-400"
      />

      <div className="px-6 pb-8 flex flex-col gap-5">
        {/* Tab bar */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowNewChallenge(false); }}
              className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150",
                activeTab === tab.id
                  ? "bg-sky-500/15 border border-sky-500/40 text-sky-400"
                  : "border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600/60",
              )}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="bg-sky-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <FontAwesomeIcon icon={faSpinnerThird} spin className="w-8 h-8 text-slate-500" />
          </div>
        ) : activeTab === "challenges" ? (
          <div className="flex gap-5 items-start">
            {/* Left: game list */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {/* Your avatar row */}
              {user && !showNewChallenge && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setPickerOpen((o) => !o)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-dashed border-violet-500/30 hover:bg-violet-500/12 hover:border-violet-500/50 transition-all duration-150 text-left"
                  >
                    <AvatarComposite face={myFace} hat={myHat} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-violet-300">You</p>
                      <p className="text-xs text-violet-400/60">Tap to customise avatar</p>
                    </div>
                    <span className="text-[11px] font-bold text-violet-400 bg-violet-500/15 border border-violet-500/25 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                      {pickerOpen
                        ? <><FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" /> Close</>
                        : <><FontAwesomeIcon icon={faPencil} className="w-2.5 h-2.5" /> Edit</>
                      }
                    </span>
                  </button>
                  <Link
                    href="/pvp/profile"
                    className="text-[10px] text-slate-600 hover:text-slate-400 text-right px-2 transition-colors"
                  >
                    View profile →
                  </Link>
                </div>
              )}

              {showNewChallenge ? (
                <NewChallengePrompt onDone={() => setShowNewChallenge(false)} />
              ) : (
                <>
                  {challengeGames.length > 0 && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Active</p>
                  )}
                  {challengeGames.map(g => (
                    <ArenaGameRow key={g.id} game={g} userId={user!.id} usernameMap={usernameMap} avatarMap={avatarMap} />
                  ))}
                  {challengeGames.length === 0 && (
                    <div className="py-8 text-center">
                      <FontAwesomeIcon icon={faSwords} className="w-8 h-8 text-slate-600 mb-3" />
                      <p className="text-sm text-slate-400">No active challenges</p>
                      <p className="text-xs text-slate-600 mt-1">Create one to get started</p>
                    </div>
                  )}
                  <button
                    onClick={() => setShowNewChallenge(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl border border-dashed border-slate-700/60 text-sm text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors duration-150 cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
                    New Challenge
                  </button>
                </>
              )}
            </div>

            {/* Avatar picker panel */}
            {pickerOpen && user && (
              <AvatarPicker
                userId={user.id}
                currentFace={myFace}
                currentHat={myHat}
                isPremium={isPremium}
                onFaceChange={handleFaceChange}
                onHatChange={handleHatChange}
              />
            )}

            {/* Right: stat cards */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-3">
              <RecordCard wins={wins} played={completedOnly.length} />
              <BestCpmCard
                cpm={bestCpm}
                opponentName={bestCpmOpponent}
                at={bestCpmGame?.updated_at ?? null}
              />
            </div>
          </div>
        ) : (
          /* History tab — full width */
          <div className="flex flex-col gap-2">
            {historyGames.length > 0 ? (
              historyGames.map(g => (
                <ArenaGameRow key={g.id} game={g} userId={user!.id} usernameMap={usernameMap} avatarMap={avatarMap} />
              ))
            ) : (
              <div className="py-12 text-center">
                <FontAwesomeIcon icon={faHistory} className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">No completed games yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
