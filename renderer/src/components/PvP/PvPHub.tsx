"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { useSupabase } from "@/lib/supabase-provider";
import { usePvP } from "@/lib/pvp-provider";
import { MatchCard } from "./MatchCard";
import { NewChallengePrompt } from "./NewChallengePrompt";
import { RivalsTab } from "./RivalsTab";

type Tab = "active" | "awaiting" | "history" | "rivals" | "new";

export function PvPHub() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useSupabase();
  const { myMatches, fetchRoundsForMatch } = usePvP();
  const [tab, setTab] = useState<Tab>(() => (params.get("tab") as Tab) ?? "active");
  const [unracedByMatch, setUnracedByMatch] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function build() {
      if (!user) return;
      const map: Record<string, boolean> = {};
      for (const m of myMatches) {
        const isCreator = m.creator_id === user.id;
        const rounds = await fetchRoundsForMatch(m.id);
        const hasUnraced = rounds.some((r) =>
          (isCreator ? r.creator_completed_at : r.joiner_completed_at) === null,
        );
        map[m.id] = hasUnraced;
      }
      if (!cancelled) setUnracedByMatch(map);
    }
    void build();
    return () => {
      cancelled = true;
    };
  }, [myMatches, user, fetchRoundsForMatch]);

  const buckets = useMemo(() => {
    const active: typeof myMatches = [];
    const awaiting: typeof myMatches = [];
    const history: typeof myMatches = [];
    for (const m of myMatches) {
      const isTerminal = ["completed", "cancelled", "expired"].includes(m.status);
      if (isTerminal) {
        history.push(m);
        continue;
      }
      if (unracedByMatch[m.id]) active.push(m);
      else awaiting.push(m);
    }
    return { active, awaiting, history };
  }, [myMatches, unracedByMatch]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "active",   label: "Active",   count: buckets.active.length },
    { key: "awaiting", label: "Awaiting", count: buckets.awaiting.length },
    { key: "history",  label: "History",  count: buckets.history.length },
    { key: "rivals",   label: "Rivals" },
    { key: "new",      label: "New" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">PvP Arena</h1>
      <nav className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              router.replace(`/pvp?tab=${t.key}`);
            }}
            className={clsx(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px",
              tab === t.key ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500",
            )}
            data-testid={`pvp-tab-${t.key}`}
          >
            {t.label}{typeof t.count === "number" ? ` (${t.count})` : ""}
          </button>
        ))}
      </nav>

      {tab === "active" && (buckets.active.length === 0
        ? <p className="text-center text-gray-500 py-8">No active games</p>
        : <div className="space-y-3">{buckets.active.map((m) => <MatchCard key={m.id} match={m} />)}</div>)}
      {tab === "awaiting" && (buckets.awaiting.length === 0
        ? <p className="text-center text-gray-500 py-8">Nothing awaiting</p>
        : <div className="space-y-3">{buckets.awaiting.map((m) => <MatchCard key={m.id} match={m} />)}</div>)}
      {tab === "history" && (buckets.history.length === 0
        ? <p className="text-center text-gray-500 py-8">No history yet</p>
        : <div className="space-y-3">{buckets.history.map((m) => <MatchCard key={m.id} match={m} />)}</div>)}
      {tab === "rivals" && <RivalsTab />}
      {tab === "new"    && <NewChallengePrompt />}
    </div>
  );
}
