"use client";

import type { FC } from "react";
import { useState, useEffect } from "react";
import { FACES, HATS, isHatUnlocked, type HatDef } from "@/lib/avatars";
import { AvatarComposite } from "./AvatarComposite";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faXmark } from "@fortawesome/free-solid-svg-icons";

interface AvatarPickerProps {
  userId: string;
  currentFace: string;
  currentHat: string | null;
  isPremium: boolean;
  onFaceChange: (slug: string) => void;
  onHatChange: (slug: string | null) => void;
  onClose?: () => void;
}

interface GameStats {
  gamesPlayed: number;
  wins: number;
}

function unlockLabel(hat: HatDef, stats: GameStats): string {
  if (hat.tier !== "earned") return "";
  const { type, count } = hat.unlockCondition;
  const current = type === "wins" ? stats.wins : stats.gamesPlayed;
  const unit = type === "wins" ? "wins" : "games";
  return `${current} / ${count} ${unit}`;
}

export function AvatarPicker({
  userId,
  currentFace,
  currentHat,
  isPremium,
  onFaceChange,
  onHatChange,
  onClose,
}: AvatarPickerProps) {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState<GameStats>({ gamesPlayed: 0, wins: 0 });

  useEffect(() => {
    async function fetchStats() {
      const [gamesRes, winsRes] = await Promise.all([
        supabase
          .from("pvp_matches")
          .select("id", { count: "exact", head: true })
          .or(`creator_id.eq.${userId},joiner_id.eq.${userId}`)
          .eq("status", "completed"),
        supabase
          .from("pvp_matches")
          .select("id", { count: "exact", head: true })
          .eq("winner_id", userId)
          .eq("status", "completed"),
      ]);
      setStats({
        gamesPlayed: gamesRes.count ?? 0,
        wins: winsRes.count ?? 0,
      });
    }
    fetchStats().catch(() => {
      // leave stats at zero — all earned hats show as locked
    });
  }, [userId, supabase]);

  const freeTier = HATS.filter((h) => h.tier === "free");
  const earnedTier = HATS.filter((h) => h.tier === "earned");
  const premiumTier = HATS.filter((h) => h.tier === "premium");

  const tierLabel = (label: string, badgeClass: string) => (
    <div className="flex items-center gap-2 mb-2 mt-3 first:mt-0">
      <span
        className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeClass}`}
      >
        {label}
      </span>
    </div>
  );

  const hatButton = (hat: HatDef) => {
    const unlocked = isHatUnlocked(hat, stats, isPremium);
    const active = (currentHat ?? "none") === hat.slug;
    const progress =
      !unlocked && hat.tier === "earned" ? unlockLabel(hat, stats) : null;
    const premiumLocked = !unlocked && hat.tier === "premium";
    const HatComp = hat.Component as FC<object> | null;

    return (
      <button
        key={hat.slug}
        title={
          premiumLocked
            ? "Premium only"
            : progress
            ? `${hat.name} — ${progress}`
            : hat.name
        }
        disabled={!unlocked}
        onClick={() => onHatChange(hat.slug === "none" ? null : hat.slug)}
        className={[
          "relative w-11 h-11 rounded-xl border-[1.5px] flex items-center justify-center transition-all duration-100",
          active
            ? "border-amber-400 bg-amber-400/10"
            : unlocked
            ? "border-slate-700 bg-slate-800 hover:border-violet-500/60"
            : "border-slate-800 bg-slate-900 opacity-40 cursor-not-allowed",
        ].join(" ")}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Show hat on a neutral grey circle so it's identifiable */}
          <circle cx="32" cy="38" r="22" fill="#334155" />
          {HatComp && <HatComp />}
        </svg>
        {!unlocked && (
          <span className="absolute bottom-0.5 right-0.5">
            <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5 text-slate-400" />
          </span>
        )}
        {progress && (
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 whitespace-nowrap">
            {progress}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-5 w-80">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Customise Avatar</p>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="flex flex-col items-center gap-2 p-4 bg-slate-900 rounded-xl">
        <AvatarComposite face={currentFace} hat={currentHat} size={88} />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Preview
        </p>
      </div>

      {/* Face grid */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          Face
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FACES.map((face) => {
            const FaceComp = face.Component as FC<object>;
            return (
              <button
                key={face.slug}
                title={face.name}
                onClick={() => onFaceChange(face.slug)}
                className={[
                  "w-11 h-11 rounded-xl border-[1.5px] flex items-center justify-center transition-all duration-100",
                  currentFace === face.slug
                    ? "border-violet-500 bg-violet-500/15"
                    : "border-slate-700 bg-slate-800 hover:border-violet-500/60",
                ].join(" ")}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 64 64"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <FaceComp />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hat tiers */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          Hat
        </p>
        <div className="flex flex-col gap-5">
          <div>
            {tierLabel(
              "Free",
              "bg-slate-700/60 text-slate-400 border border-slate-600/40",
            )}
            <div className="flex flex-wrap gap-1.5">{freeTier.map(hatButton)}</div>
          </div>
          <div>
            {tierLabel(
              "Earned",
              "bg-amber-500/15 text-amber-400 border border-amber-500/25",
            )}
            <div className="flex flex-wrap gap-2">{earnedTier.map(hatButton)}</div>
          </div>
          <div>
            {tierLabel(
              "Premium",
              "bg-violet-500/15 text-violet-400 border border-violet-500/25",
            )}
            <div className="flex flex-wrap gap-1.5">
              {premiumTier.map(hatButton)}
            </div>
            {!isPremium && (
              <p className="text-[10px] text-slate-600 mt-2">
                Upgrade to premium to unlock these hats.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
