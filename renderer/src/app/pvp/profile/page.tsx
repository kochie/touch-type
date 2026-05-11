// renderer/src/app/pvp/profile/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/pro-regular-svg-icons";
import { AvatarComposite } from "@/components/avatars/AvatarComposite";
import { useSupabase } from "@/lib/supabase-provider";

interface ProfileData {
  displayName: string;
  face: string;
  hat: string | null;
  gamesPlayed: number;
  wins: number;
  bestCpm: number | null;
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const { user, supabase } = useSupabase();
  const targetId = searchParams.get("id") ?? user?.id ?? null;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    async function load() {
      const id = targetId!;

      const [profileRes, gamesPlayedRes, winsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("preferred_username, name, equipped_face, equipped_hat")
          .eq("id", id)
          .single(),
        supabase
          .from("pvp_matches")
          .select("id", { count: "exact", head: true })
          .or(`creator_id.eq.${id},joiner_id.eq.${id}`)
          .eq("status", "completed"),
        supabase
          .from("pvp_matches")
          .select("id", { count: "exact", head: true })
          .eq("winner_id", id)
          .eq("status", "completed"),
      ]);

      const p = profileRes.data;

      // Compute best CPM: fetch match IDs for this user, then join pvp_games
      let bestCpm: number | null = null;

      const matchesRes = await supabase
        .from("pvp_matches")
        .select("id, creator_id")
        .or(`creator_id.eq.${id},joiner_id.eq.${id}`)
        .eq("status", "completed");

      if (matchesRes.data && matchesRes.data.length > 0) {
        const matchIds = matchesRes.data.map((m) => m.id);
        const gamesRes = await supabase
          .from("pvp_games")
          .select("creator_cpm, joiner_cpm, match_id")
          .in("match_id", matchIds);

        for (const g of gamesRes.data ?? []) {
          const match = matchesRes.data.find((m) => m.id === g.match_id);
          if (!match) continue;
          const cpm =
            match.creator_id === id ? g.creator_cpm : g.joiner_cpm;
          if (cpm != null && (bestCpm === null || cpm > bestCpm)) {
            bestCpm = cpm;
          }
        }
      }

      setProfile({
        displayName:
          p?.preferred_username ||
          p?.name ||
          id.slice(0, 8),
        face: p?.equipped_face ?? "classic",
        hat: p?.equipped_hat ?? null,
        gamesPlayed: gamesPlayedRes.count ?? 0,
        wins: winsRes.count ?? 0,
        bestCpm,
      });
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [targetId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-sm text-slate-500 text-center py-16">
        Profile not found.
      </p>
    );
  }

  const winRate =
    profile.gamesPlayed > 0
      ? ((profile.wins / profile.gamesPlayed) * 100).toFixed(0)
      : "0";

  return (
    <div className="flex flex-col items-center gap-6 py-12 px-6 max-w-sm mx-auto">
      <AvatarComposite face={profile.face} hat={profile.hat} size={96} />
      <h1 className="text-2xl font-bold text-slate-100">{profile.displayName}</h1>

      <div className="w-full grid grid-cols-3 gap-3">
        {[
          { label: "Games", value: profile.gamesPlayed },
          { label: "Wins", value: profile.wins },
          { label: "Win rate", value: `${winRate}%` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl py-3"
          >
            <p className="text-lg font-bold text-sky-400 tabular-nums">
              {value}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      {profile.bestCpm != null && (
        <div className="w-full flex flex-col items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl py-4">
          <p className="text-3xl font-bold text-amber-400 tabular-nums">
            {profile.bestCpm.toFixed(0)}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Best CPM in Arena
          </p>
        </div>
      )}

      <Link
        href="/pvp"
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
        Back to Arena
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-64">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
