"use client";

import { usePvP, myBestCpmInMatch, type PvPMatch } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import {
  faHistory,
  faPlus,
  faSwords,
  faSpinnerThird,
  faUserSlash,
  faRightToBracket,
} from "@fortawesome/pro-duotone-svg-icons";
import { faPencil } from "@fortawesome/pro-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import NewChallengePrompt from "./NewChallengePrompt";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import LeaderboardTab from "./LeaderboardTab";
import { formatDistanceToNow } from "@/lib/relative-time";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isPremiumPlan, usePlan } from "@/lib/plan_hook";
import { AvatarComposite } from "@/components/avatars/AvatarComposite";
import { AvatarPicker } from "@/components/avatars/AvatarPicker";
import Link from "next/link";

type TabId = "challenges" | "history" | "leaderboard";

// Invite codes are 12 uppercase alphanumerics — see generate_invite_code in
// touch-type-backend/supabase/migrations/.../recover_pvp_schema.sql
const INVITE_CODE_RE = /^[A-Z0-9]{12}$/;

/**
 * Pulls an invite code out of any of:
 *   - the raw 12-char code
 *   - a `touchtyper://pvp/invite/CODE` deep link
 *   - a `https://touch-typer.kochie.io/pvp/invite?code=CODE` web link
 *   - anything else with `?code=CODE` in its query string
 * Case-insensitive on input, normalised to uppercase on output.
 */
function extractInviteCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const deepLink = trimmed.match(/^touchtyper:\/\/pvp\/invite\/([A-Za-z0-9]{12})$/);
  if (deepLink) return deepLink[1].toUpperCase();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code")?.toUpperCase() ?? null;
    if (code && INVITE_CODE_RE.test(code)) return code;
  } catch {
    // not a URL — fall through to raw-code check
  }
  const upper = trimmed.toUpperCase();
  return INVITE_CODE_RE.test(upper) ? upper : null;
}

// ── Game row ─────────────────────────────────────────────────────────────────

interface ArenaMatchRowProps {
  match: PvPMatch;
  userId: string;
  usernameMap: Record<string, string>;
  avatarMap: Record<string, { face: string; hat: string | null }>;
}

function ArenaMatchRow({ match, userId, usernameMap, avatarMap }: ArenaMatchRowProps) {
  const router = useRouter();
  const { startRace } = usePvP();

  const isCreator = match.creator_id === userId;
  const opponentId = isCreator ? (match.joiner_id ?? "") : match.creator_id;
  const opponentName = usernameMap[opponentId] ?? (opponentId ? opponentId.slice(0, 8) : "Open");
  const opponentAvatar = avatarMap[opponentId] ?? { face: "classic", hat: null };

  const myWins = isCreator ? match.creator_wins : match.joiner_wins;
  const oppWins = isCreator ? match.joiner_wins : match.creator_wins;
  const isWinner = match.winner_id === userId;
  const myBest = myBestCpmInMatch(match, userId);
  const hasUnracedRound = match.rounds.some(
    (r) => (isCreator ? r.creator_completed_at : r.joiner_completed_at) === null,
  );

  let statusLabel: string;
  let statusClass: string;
  if (match.status === "completed") {
    const cpmStr = myBest != null ? ` · ${myBest.toFixed(0)} CPM` : "";
    statusLabel = isWinner ? `WON ${myWins}-${oppWins}${cpmStr}` : `LOST ${myWins}-${oppWins}${cpmStr}`;
    statusClass = isWinner
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
      : "bg-inset text-fg-muted border border-slate-600/40";
  } else if (hasUnracedRound) {
    statusLabel = match.best_of > 1 ? `YOUR TURN · ${myWins}-${oppWins}` : "YOUR TURN";
    statusClass = "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25";
  } else {
    statusLabel = match.best_of > 1 ? `WAITING · ${myWins}-${oppWins}` : "WAITING";
    statusClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25";
  }

  const wordCount = match.rounds[0]?.word_set.length ?? 0;
  const langLabel = match.language.charAt(0).toUpperCase() + match.language.slice(1);
  const levelLabel = `Level ${match.level}`;
  const formatLabel =
    match.best_of === 1 ? "Single race" : `Best of ${match.best_of}`;

  const handleClick = () => {
    if (!isTerminalStatus(match.status) && hasUnracedRound) {
      startRace(match);
      router.push("/");
    } else {
      router.push(`/pvp/challenge?id=${match.id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-line hover:bg-inset hover:border-slate-600/50 transition-all duration-150 text-left"
    >
      <AvatarComposite face={opponentAvatar.face} hat={opponentAvatar.hat} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg truncate">{opponentName}</p>
        <p className="text-xs text-fg-subtle">{wordCount} words · {langLabel} · {levelLabel} · {formatLabel}</p>
      </div>
      <span className={clsx("flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full", statusClass)}>
        {statusLabel}
      </span>
    </button>
  );
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "cancelled" || status === "expired";
}

// ── Join with an invite code ──────────────────────────────────────────────────

function JoinByCodeInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const code = extractInviteCode(value);
  const canSubmit = code !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError("Enter a 12-character code or paste an invite link");
      return;
    }
    setError(null);
    router.push(`/pvp/invite?code=${code}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-1"
    >
      <div className="flex gap-2">
        <input
          data-testid="pvp-join-by-code"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste an invite link or 12-char code"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-800/40 border border-line text-sm text-fg placeholder:text-slate-500 font-mono focus:outline-none focus:border-sky-500/60"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sm font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FontAwesomeIcon icon={faRightToBracket} className="w-3.5 h-3.5" />
          Join
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-700 dark:text-red-400 px-1">{error}</p>
      )}
    </form>
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
    <div className="rounded-xl bg-surface border border-line px-5 py-4 flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Your Record</p>
      <p className="text-4xl font-bold text-sky-700 dark:text-sky-400 tabular-nums">{wins}</p>
      <p className="text-sm text-fg-muted">wins / {played} played</p>
      <div className="w-full h-1.5 rounded-full bg-inset overflow-hidden">
        <div
          className="h-full bg-sky-400 rounded-full transition-all duration-500"
          style={{ width: `${rate * 100}%` }}
        />
      </div>
      <p className="text-xs text-fg-subtle">{played > 0 ? `${(rate * 100).toFixed(0)}% win rate` : "No games yet"}</p>
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
    <div className="rounded-xl bg-surface border border-line px-5 py-4 flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Best CPM in Arena</p>
      {cpm != null ? (
        <>
          <p className="text-4xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">{cpm.toFixed(0)}</p>
          <p className="text-xs text-fg-subtle">
            {opponentName ? `vs ${opponentName}` : ""}
            {at ? ` · ${formatDistanceToNow(at)}` : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-fg-subtle">Complete a game to set a record</p>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function PvPHub() {
  const [activeTab, setActiveTab] = useState<TabId>("challenges");
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const { user, isLoading: isUserLoading, supabase } = useSupabase();
  const { myActiveMatches, myAwaitingMatches, myCompletedMatches, isLoading } = usePvP();
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});

  const plan = usePlan();
  const isPremium = isPremiumPlan(plan);

  const [avatarMap, setAvatarMap] = useState<Record<string, { face: string; hat: string | null }>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myFace, setMyFace] = useState("classic");
  const [myHat, setMyHat] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string>("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState("");

  const allMatches = useMemo(() => [...myActiveMatches, ...myAwaitingMatches, ...myCompletedMatches], [myActiveMatches, myAwaitingMatches, myCompletedMatches]);
  const challengeMatches = useMemo(() => [...myActiveMatches, ...myAwaitingMatches], [myActiveMatches, myAwaitingMatches]);
  const historyMatches = useMemo(() => myCompletedMatches, [myCompletedMatches]);

  // Fetch own avatar and username on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("equipped_face, equipped_hat, preferred_username, name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setMyFace(data.equipped_face ?? "classic");
        setMyHat(data.equipped_hat ?? null);
        setMyUsername(data.preferred_username || data.name || "");
      });
  }, [user, supabase]);

  // Batch-fetch opponent usernames and avatars
  useEffect(() => {
    if (!user || allMatches.length === 0) return;
    const ids = [...new Set(
      allMatches.flatMap(m => [m.creator_id, m.joiner_id].filter((id): id is string => !!id && id !== user.id))
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
  }, [allMatches, user, supabase]);

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

  const handleUsernameSave = useCallback(async () => {
    if (!user) return;
    const trimmed = draftUsername.trim();
    if (!trimmed || trimmed === myUsername) { setEditingUsername(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_username: trimmed })
      .eq("id", user.id);
    if (error) {
      toast.error("Couldn't save username.");
    } else {
      setMyUsername(trimmed);
      toast.success("Username updated.");
    }
    setEditingUsername(false);
  }, [user, supabase, draftUsername, myUsername]);

  // Stats from completed matches
  const completedOnly = useMemo(
    () => myCompletedMatches.filter((m) => m.status === "completed"),
    [myCompletedMatches],
  );
  const wins = user ? completedOnly.filter(m => m.winner_id === user.id).length : 0;

  // Best CPM is per-round (v4 model), so iterate every round of every
  // completed match and pick this user's best.
  const { bestCpm, bestCpmMatch } = useMemo(() => {
    if (!user) return { bestCpm: null, bestCpmMatch: null };
    let best: number | null = null;
    let bestMatch: PvPMatch | null = null;
    for (const m of completedOnly) {
      const local = myBestCpmInMatch(m, user.id);
      if (local != null && (best === null || local > best)) {
        best = local;
        bestMatch = m;
      }
    }
    return { bestCpm: best, bestCpmMatch: bestMatch };
  }, [completedOnly, user]);

  const bestCpmOpponent = useMemo(() => {
    if (!bestCpmMatch || !user) return null;
    const opponentId = bestCpmMatch.creator_id === user.id ? bestCpmMatch.joiner_id : bestCpmMatch.creator_id;
    return opponentId ? (usernameMap[opponentId] ?? opponentId.slice(0, 8)) : null;
  }, [bestCpmMatch, user, usernameMap]);

  if (!isUserLoading && !user) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-center py-20">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center">
          <FontAwesomeIcon icon={faUserSlash} className="w-8 h-8 text-fg-subtle" />
        </div>
        <p className="text-lg font-semibold text-fg-muted">Sign in to play Arena</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "challenges", label: "Challenges", badge: myActiveMatches.length },
    { id: "history", label: "History" },
    { id: "leaderboard", label: "Leaderboard" },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        icon={faSwords}
        title="Arena"
        subtitle="Challenge friends and climb the leaderboard"
        iconBg="bg-amber-400/10"
        iconColor="text-amber-700 dark:text-amber-400"
      />

      <div className="px-6 pb-8">
        <div className={clsx(
          "mx-auto w-full flex flex-col gap-5",
          activeTab === "leaderboard" ? "max-w-5xl" : "max-w-3xl",
        )}>
        {/* Tab bar */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowNewChallenge(false); }}
              className={clsx(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150",
                activeTab === tab.id
                  ? "bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-sky-400"
                  : "border border-line text-fg-muted hover:text-fg hover:border-slate-600/60",
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
            <FontAwesomeIcon icon={faSpinnerThird} spin className="w-8 h-8 text-fg-subtle" />
          </div>
        ) : activeTab === "challenges" ? (
          <div className="flex gap-5 items-start">
            {/* Left: game list */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {challengeMatches.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle mb-1">Active</p>
              )}
              {challengeMatches.map(m => (
                <ArenaMatchRow key={m.id} match={m} userId={user!.id} usernameMap={usernameMap} avatarMap={avatarMap} />
              ))}
              {challengeMatches.length === 0 && (
                <div className="py-8 text-center">
                  <FontAwesomeIcon icon={faSwords} className="w-8 h-8 text-slate-600 mb-3" />
                  <p className="text-sm text-fg-muted">No active challenges</p>
                  <p className="text-xs text-slate-600 mt-1">Create one to get started</p>
                </div>
              )}
              <button
                onClick={() => setShowNewChallenge(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl border border-dashed border-line text-sm text-fg-subtle hover:text-fg hover:border-slate-600 transition-colors duration-150 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
                New Challenge
              </button>

              <JoinByCodeInput />
            </div>

            {/* Right: avatar + stat cards */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-3">
              {user && (
                <div className="rounded-xl bg-surface border border-line overflow-hidden">
                  {/* Avatar row */}
                  <button
                    onClick={() => setPickerOpen((o) => !o)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/40 transition-colors duration-150 text-left"
                  >
                    <AvatarComposite face={myFace} hat={myHat} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-fg-muted">Your avatar</p>
                      <p className="text-[11px] text-fg-subtle mt-0.5">Tap to customise</p>
                    </div>
                    <span className="text-[10px] font-semibold text-fg-muted bg-inset border border-slate-600/60 rounded-full px-2 py-0.5 flex items-center gap-1 flex-shrink-0">
                      <FontAwesomeIcon icon={faPencil} className="w-2 h-2" /> Edit
                    </span>
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-inset mx-4" />

                  {/* Username row — always visible */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle mb-1.5">Username</p>
                    {editingUsername ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={draftUsername}
                          onChange={e => setDraftUsername(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleUsernameSave();
                            if (e.key === "Escape") setEditingUsername(false);
                          }}
                          maxLength={32}
                          className="flex-1 min-w-0 bg-slate-900 border border-line rounded-lg px-2.5 py-1.5 text-sm text-fg placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          placeholder="Enter username…"
                        />
                        <button onClick={handleUsernameSave} className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 px-2 py-1 rounded transition-colors">Save</button>
                        <button onClick={() => setEditingUsername(false)} className="text-xs text-fg-subtle hover:text-fg px-1 py-1 rounded transition-colors">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setDraftUsername(myUsername); setEditingUsername(true); }}
                        className="w-full flex items-center justify-between gap-2 group"
                      >
                        <span className="text-sm font-semibold text-fg truncate">
                          {myUsername || <span className="text-fg-subtle font-normal italic">No username set</span>}
                        </span>
                        <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-400 bg-violet-500/15 border border-violet-500/25 rounded-full px-2 py-0.5 flex items-center gap-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                          <FontAwesomeIcon icon={faPencil} className="w-2 h-2" /> Change
                        </span>
                      </button>
                    )}
                  </div>

                  {/* View profile link */}
                  <div className="h-px bg-inset mx-4" />
                  <Link
                    href="/pvp/profile"
                    className="flex items-center justify-center px-4 py-2 text-[11px] text-fg-subtle hover:text-fg transition-colors"
                  >
                    View full profile →
                  </Link>
                </div>
              )}
              <RecordCard wins={wins} played={completedOnly.length} />
              <BestCpmCard
                cpm={bestCpm}
                opponentName={bestCpmOpponent}
                at={bestCpmMatch?.updated_at ?? null}
              />
            </div>
          </div>
        ) : activeTab === "history" ? (
          /* History tab — full width */
          <div className="flex flex-col gap-2">
            {historyMatches.length > 0 ? (
              historyMatches.map(m => (
                <ArenaMatchRow key={m.id} match={m} userId={user!.id} usernameMap={usernameMap} avatarMap={avatarMap} />
              ))
            ) : (
              <div className="py-12 text-center">
                <FontAwesomeIcon icon={faHistory} className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-sm text-fg-muted">No completed matches yet</p>
              </div>
            )}
          </div>
        ) : (
          /* Leaderboard tab */
          <LeaderboardTab />
        )}
        </div>
      </div>

      {/* New challenge modal */}
      <Modal
        open={showNewChallenge}
        onClose={() => setShowNewChallenge(false)}
        panelClassName="relative transform rounded-2xl bg-slate-900 border border-line shadow-2xl transition-all my-8"
      >
        <NewChallengePrompt
          onDone={() => setShowNewChallenge(false)}
          onClose={() => setShowNewChallenge(false)}
        />
      </Modal>

      {/* Avatar picker modal */}
      <Modal
        open={pickerOpen && !!user}
        onClose={() => setPickerOpen(false)}
        panelClassName="relative transform rounded-2xl bg-slate-950 border border-line shadow-2xl transition-all my-8 overflow-y-auto max-h-[90vh]"
      >
        {user && (
          <AvatarPicker
            userId={user.id}
            currentFace={myFace}
            currentHat={myHat}
            isPremium={isPremium}
            onFaceChange={handleFaceChange}
            onHatChange={handleHatChange}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
