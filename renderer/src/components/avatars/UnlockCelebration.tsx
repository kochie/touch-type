"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSupabase } from "@/lib/supabase-provider";
import { useResults } from "@/lib/result-provider";
import { usePlan, isPremiumPlan } from "@/lib/plan_hook";
import { useStreak } from "@/lib/streak_hook";
import { useSettings } from "@/lib/settings_hook";
import { FACES, HATS, PERFECT_MIN_CORRECT, type AvatarStats } from "@/lib/avatars";
import { diffUnlocks, premiumJustActivated, unlockedIds } from "@/lib/avatar-unlocks";
import { metrics } from "@/lib/metrics";

const COLORS = ["#fbbf24", "#a78bfa", "#34d399", "#60a5fa", "#f87171", "#f9a8d4"];

/** CSS-only confetti burst that removes itself. */
export function Confetti({ onDone }: { onDone: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: 50 + (Math.random() - 0.5) * 20,
        dx: (Math.random() - 0.5) * 70,
        delay: Math.random() * 0.25,
        dur: 1.6 + Math.random() * 1.2,
        color: COLORS[i % COLORS.length],
        size: 5 + Math.floor(Math.random() * 5),
        spin: Math.random() * 720 - 360,
      })),
    [],
  );
  useEffect(() => {
    const t = setTimeout(onDone, 3400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden motion-reduce:hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-1/3 block rounded-[1px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `confetti-fall ${p.dur}s cubic-bezier(.2,.7,.3,1) ${p.delay}s forwards`,
            ["--dx" as string]: `${p.dx}vw`,
            ["--spin" as string]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

const nameOf = (id: string) => {
  const [kind, slug] = id.split(":");
  return (kind === "face" ? FACES.find((f) => f.slug === slug) : HATS.find((h) => h.slug === slug))?.name ?? slug;
};

/** Watches for newly earned avatar items and Premium activation, then celebrates. Renders nothing until it does. */
export function UnlockCelebration() {
  const { supabase, user } = useSupabase();
  const { results } = useResults();
  const plan = usePlan();
  const { reduceMotion } = useSettings();
  const { longestStreak, lastActivityDate } = useStreak();
  const isPremium = isPremiumPlan(plan);
  const [burst, setBurst] = useState(0);
  const [pvp, setPvp] = useState<{ gamesPlayed: number; wins: number } | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [games, wins] = await Promise.all([
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
      if (!cancelled) setPvp({ gamesPlayed: games.count ?? 0, wins: wins.count ?? 0 });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const perfectKey = useMemo(
    () =>
      [...new Set(results.filter((r) => r.incorrect === 0 && r.correct >= PERFECT_MIN_CORRECT).map((r) => r.keyboard))]
        .sort()
        .join(","),
    [results],
  );

  useEffect(() => {
    // The streak hook reads 0 until it loads; a baseline taken then would fake an unlock later.
    const streakLoaded = longestStreak > 0 || lastActivityDate !== null;
    if (!userId || !pvp || plan === null || !streakLoaded) return;
    const stats: AvatarStats = { ...pvp, perfectLayouts: perfectKey ? perfectKey.split(",") : [], longestStreak };
    const fresh = diffUnlocks(userId, unlockedIds(stats, isPremium));
    const premiumNow = premiumJustActivated(userId, isPremium);
    if (premiumNow) {
      metrics.count("avatar.premium_welcome");
      if (!reduceMotion) setBurst((n) => n + 1);
      toast.success("Welcome to Premium", {
        description: "Premium hats are unlocked. Open the avatar picker to try them on.",
        duration: 7000,
      });
    }
    const earned = fresh.filter((id) => !(premiumNow && HATS.find((h) => `hat:${h.slug}` === id)?.tier === "premium"));
    if (earned.length) {
      for (const id of earned) {
        const [kind, item] = id.split(":");
        metrics.count("avatar.unlocked", 1, { kind, item });
      }
      if (!reduceMotion) setBurst((n) => n + 1);
      toast.success(earned.length === 1 ? "New avatar item unlocked" : `${earned.length} new avatar items unlocked`, {
        description: earned.map(nameOf).join(", "),
        duration: 7000,
      });
    }
  }, [userId, pvp, perfectKey, isPremium, plan, longestStreak, lastActivityDate, reduceMotion]);

  return burst ? <Confetti key={burst} onDone={() => setBurst(0)} /> : null;
}
