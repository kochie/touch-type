"use client";

import { useState, useEffect } from "react";
import {
  FACES,
  HATS,
  PERFECT_MIN_CORRECT,
  getFace,
  getHat,
  isFaceUnlocked,
  howToEarnFace,
  howToEarnHat,
  isHatUnlocked,
  unlockProgress,
  type AvatarStats,
  type HatDef,
} from "@/lib/avatars";
import { AvatarComposite } from "./AvatarComposite";
import { HoverTip } from "./HoverTip";
import { clearNewUnlock, getNewUnlocks, unlockId } from "@/lib/avatar-unlocks";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { useStreak } from "@/lib/streak_hook";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBug, faLock, faXmark } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

interface AvatarPickerProps {
  userId: string;
  currentFace: string;
  currentHat: string | null;
  isPremium: boolean;
  onFaceChange: (slug: string) => void;
  onHatChange: (slug: string | null) => void;
  onClose?: () => void;
}

const NO_STATS: AvatarStats = { gamesPlayed: 0, wins: 0, perfectLayouts: [], longestStreak: 0 };

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
  const { longestStreak } = useStreak();
  const [fetched, setStats] = useState<AvatarStats>(NO_STATS);
  const stats = { ...fetched, longestStreak };
  // Locked items can be previewed without equipping them.
  const [preview, setPreview] = useState<{ face?: string; hat?: string | null }>({});
  const [fresh, setFresh] = useState<string[]>([]);
  useEffect(() => setFresh(getNewUnlocks(userId)), [userId]);
  const dismissNew = (id: string) => {
    clearNewUnlock(userId, id);
    setFresh((f) => f.filter((x) => x !== id));
  };
  const newBadge = (id: string) =>
    fresh.includes(id) && (
      <span className="absolute -top-1 -right-1 z-10 rounded-full bg-amber-400 px-1 text-[7px] font-extrabold leading-3 text-slate-900 motion-safe:animate-[av-new-pulse_1.6s_ease-in-out_infinite]">
        NEW
      </span>
    );

  useEffect(() => {
    async function fetchStats() {
      const [gamesRes, winsRes, perfectRes] = await Promise.all([
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
        supabase
          .from("results")
          .select("keyboard")
          .eq("user_id", userId)
          .eq("incorrect", 0)
          .gte("correct", PERFECT_MIN_CORRECT)
          .limit(5000),
      ]);
      setStats({
        gamesPlayed: gamesRes.count ?? 0,
        wins: winsRes.count ?? 0,
        perfectLayouts: [...new Set((perfectRes.data ?? []).map((r) => r.keyboard))],
        longestStreak: 0,
      });
    }
    fetchStats().catch(() => {
      // leave stats at zero — all earned hats show as locked
    });
  }, [userId, supabase]);

  const shownFace = preview.face ?? currentFace;
  const shownHat = preview.hat !== undefined ? preview.hat : currentHat;
  const previewLocked =
    !isFaceUnlocked(getFace(shownFace), stats) || !isHatUnlocked(getHat(shownHat), stats, isPremium);

  const hatButton = (hat: HatDef) => {
    const unlocked = isHatUnlocked(hat, stats, isPremium);
    const active = (currentHat ?? "none") === hat.slug;
    const previewing = !unlocked && (shownHat ?? "none") === hat.slug;
    const progress =
      !unlocked && hat.tier === "earned" ? unlockProgress(hat.unlockCondition, stats) : null;
    const premiumLocked = !unlocked && hat.tier === "premium";

    return (
      <HoverTip
        key={hat.slug}
        name={hat.name}
        description={hat.description}
        earn={howToEarnHat(hat)}
        progress={progress}
      >
      <button
        aria-label={hat.name}
        aria-disabled={!unlocked}
        onMouseEnter={() => dismissNew(unlockId("hat", hat.slug))}
        onClick={() => {
          const value = hat.slug === "none" ? null : hat.slug;
          if (unlocked) {
            onHatChange(value);
            setPreview((p) => ({ ...p, hat: undefined }));
          } else {
            setPreview((p) => ({ ...p, hat: value }));
          }
        }}
        className={[
          "relative w-11 h-11 rounded-xl border-[1.5px] flex items-center justify-center transition-all duration-100",
          active
            ? "border-amber-400 bg-amber-400/10"
            : unlocked
            ? "border-slate-700 bg-slate-800 hover:border-violet-500/60"
            : previewing
            ? "border-dashed border-amber-400/80 bg-slate-900"
            : "border-slate-800 bg-slate-900 opacity-50 hover:opacity-80",
        ].join(" ")}
      >
        <AvatarComposite
          face={shownFace}
          hat={hat.slug === "none" ? null : hat.slug}
          size={36}
          motion="hover"
        />
        {newBadge(unlockId("hat", hat.slug))}
        {!unlocked && (
          <span className="absolute bottom-0.5 right-0.5">
            <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5 text-slate-400" />
          </span>
        )}
      </button>
      </HoverTip>
    );
  };

  return (
    <div data-tooltip-bounds className="flex w-full flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-200">Customise Avatar</p>
          {process.env.NODE_ENV === "development" && (
            <Link
              href="/dev/avatars"
              className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 hover:bg-amber-500/25"
            >
              <FontAwesomeIcon icon={faBug} className="h-2.5 w-2.5" />
              Debug
            </Link>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Preview */}
        <div className="flex h-fit w-48 shrink-0 flex-col items-center gap-2 rounded-xl bg-slate-900 p-4">
          <AvatarComposite face={shownFace} hat={shownHat} size={112} />
          <p
            className={`text-center text-[10px] font-semibold uppercase tracking-widest ${
              previewLocked ? "text-amber-400" : "text-slate-500"
            }`}
          >
            {previewLocked ? "Locked · preview only" : "Preview"}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <section>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Faces</p>
            <div className="grid grid-cols-[repeat(auto-fill,2.75rem)] gap-2">
          {FACES.map((face) => {
            const unlocked = isFaceUnlocked(face, stats);
            const progress =
              !unlocked && face.unlockCondition ? unlockProgress(face.unlockCondition, stats) : null;
            return (
              <HoverTip
                key={face.slug}
                name={face.name}
                description={face.description}
                earn={howToEarnFace(face)}
                progress={progress}
              >
              <button
                aria-label={face.name}
                aria-disabled={!unlocked}
                onMouseEnter={() => dismissNew(unlockId("face", face.slug))}
                onClick={() => {
                  if (unlocked) {
                    onFaceChange(face.slug);
                    setPreview((p) => ({ ...p, face: undefined }));
                  } else {
                    setPreview((p) => ({ ...p, face: face.slug }));
                  }
                }}
                className={[
                  "relative w-11 h-11 rounded-xl border-[1.5px] flex items-center justify-center transition-all duration-100",
                  currentFace === face.slug
                    ? "border-violet-500 bg-violet-500/15"
                    : unlocked
                    ? "border-slate-700 bg-slate-800 hover:border-violet-500/60"
                    : shownFace === face.slug
                    ? "border-dashed border-amber-400/80 bg-slate-900"
                    : "border-slate-800 bg-slate-900 opacity-50 hover:opacity-80",
                ].join(" ")}
              >
                <AvatarComposite face={face.slug} size={36} motion="hover" />
                {newBadge(unlockId("face", face.slug))}
                {!unlocked && (
                  <span className="absolute bottom-0.5 right-0.5">
                    <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5 text-slate-400" />
                  </span>
                )}
              </button>
              </HoverTip>
            );
          })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">Hats</p>
            <div className="grid grid-cols-[repeat(auto-fill,2.75rem)] gap-2">{HATS.map(hatButton)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
