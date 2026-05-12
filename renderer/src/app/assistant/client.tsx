"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";
import { ModalType, useModal } from "@/lib/modal-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { usePlan } from "@/lib/plan_hook";
import { AssistantChat } from "@/components/AiAssistant/AssistantChat";
import { InsightCard } from "@/components/AiAssistant/InsightCard";
import { InsightSummary } from "@/components/AiAssistant/InsightSummary";
import { InsightHeatmap } from "@/components/AiAssistant/InsightHeatmap";
import { getAiInsights } from "@/transactions/getAiInsights";
import { refreshAiInsights } from "@/transactions/refreshAiInsights";
import { Skeleton } from "@/components/Skeleton";
import type { AiInsight } from "@/types/ai-insights";
import {
  faBoltLightning,
  faBullseye,
  faCoffee,
  faKeyboard,
  faMusicNote,
  faSpinnerThird,
} from "@fortawesome/pro-duotone-svg-icons";
import { faArrowsRotate, faMicrochipAi } from "@fortawesome/pro-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const features = [
  {
    icon: faBoltLightning,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-400/10",
    title: "Speed Coaching",
    description:
      "Identify your slowest keys and bigrams. Get targeted drills to push past your WPM ceiling.",
  },
  {
    icon: faBullseye,
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10",
    title: "Accuracy Analysis",
    description:
      "Pinpoint error-prone letter pairs and finger stretches before bad habits take hold.",
  },
  {
    icon: faCoffee,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-400/10",
    title: "Ergonomic Insights",
    description:
      "Understand hand balance and movement patterns to keep your typing comfortable long-term.",
  },
  {
    icon: faKeyboard,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    title: "Practice Plans",
    description:
      "Personalised exercises generated from your recent sessions — not generic word lists.",
  },
  {
    icon: faMusicNote,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-400/10",
    title: "Rhythm Training",
    description:
      "Even out keystroke timing to build a smooth, consistent cadence across every finger.",
  },
];

function LoadingSpinner() {
  return (
    <div className="w-full flex justify-center h-full">
      <div className="text-3xl font-semibold my-20 text-slate-300">
        <FontAwesomeIcon icon={faSpinnerThird} spin className="mx-5" />
      </div>
    </div>
  );
}

function UnauthenticatedView() {
  const { setModal } = useModal();
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        icon={faMicrochipAi}
        title="AI Assistant"
        subtitle="Personalized coaching based on your sessions"
        iconBg="bg-violet-400/10"
        iconColor="text-violet-400"
      />
      <div className="px-6 pb-6 flex flex-col gap-8">
        <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 px-6 py-5">
          <p className="text-base font-semibold text-slate-100 mb-1">
            Your personal typing coach, powered by AI
          </p>
          <p className="text-sm text-slate-400">
            Sign in to unlock personalised feedback across speed, accuracy,
            ergonomics, practice, and rhythm — tailored to your actual sessions.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 flex gap-4 items-start"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${f.iconBg}`}
              >
                <FontAwesomeIcon
                  icon={f.icon}
                  className={`w-5 h-5 ${f.iconColor}`}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100 mb-0.5">
                  {f.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-400">
            Free to get started — premium unlocks the full assistant.
          </p>
          <div className="flex gap-4 w-72">
            <Button onClick={() => setModal(ModalType.SIGN_IN)}>Sign In</Button>
            <Button onClick={() => setModal(ModalType.SIGN_UP)}>Sign Up</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-col overflow-y-auto">
      <PageHeader
        icon={faMicrochipAi}
        title="AI Assistant"
        subtitle="Personalized coaching based on your sessions"
        iconBg="bg-violet-400/10"
        iconColor="text-violet-400"
      />
      <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
        {refreshing ? (
          <>
            <FontAwesomeIcon
              icon={faSpinnerThird}
              spin
              className="w-8 h-8 text-violet-400"
            />
            <p className="text-sm text-slate-400">Analysing your sessions…</p>
            <div className="w-full max-w-md flex flex-col gap-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </>
        ) : (
          <>
            <p className="text-slate-300 font-semibold">No analysis yet</p>
            <p className="text-sm text-slate-500 max-w-xs">
              Your first analysis will run tonight, or tap Refresh to generate
              it now.
            </p>
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
              Refresh now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InsightsDashboard({
  insight,
  onRefresh,
  refreshing,
  animateSummary,
}: {
  insight: AiInsight;
  onRefresh: () => void;
  refreshing: boolean;
  animateSummary: boolean;
}) {
  return (
    <div className="flex flex-col overflow-y-auto">
      <PageHeader
        icon={faMicrochipAi}
        title="AI Assistant"
        subtitle="Personalized coaching based on your sessions"
        iconBg="bg-violet-400/10"
        iconColor="text-violet-400"
        headerRight={
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700/50"
          >
            <FontAwesomeIcon
              icon={faArrowsRotate}
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Analysing…" : "Refresh"}
          </button>
        }
      />
      <div className="px-6 pb-8 flex flex-col gap-6">
        {insight.insight_cards.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insight.insight_cards.map((card) => (
              <InsightCard key={card.category} card={card} />
            ))}
          </div>
        )}

        {insight.summary && (
          <InsightSummary
            summary={insight.summary}
            weekStart={insight.week_start}
            animate={animateSummary}
          />
        )}

        {insight.heatmap_data.length > 0 && (
          <div className="rounded-xl bg-slate-800/30 border border-slate-700/40 px-5 py-6">
            <p className="text-sm font-semibold text-slate-300 mb-4">
              Key timing heatmap
            </p>
            <InsightHeatmap heatmapData={insight.heatmap_data} />
          </div>
        )}

        {/* Live AI coaching chat */}
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40">
            <p className="text-sm font-semibold text-slate-300">Ask your coach</p>
            <p className="text-xs text-slate-500 mt-0.5">
              AI-powered responses based on your session data
            </p>
          </div>
          <AssistantChat key={insight.id} insight={insight} />
        </div>
      </div>
    </div>
  );
}

export function ClientAssistant() {
  const { setModal } = useModal();
  const { user, isLoading: userLoading } = useSupabase();
  const plan = usePlan();

  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animateSummary, setAnimateSummary] = useState(false);

  useEffect(() => {
    if (!user || !plan || plan.billing_plan === "free") return;
    getAiInsights()
      .then(setInsight)
      .catch(console.error)
      .finally(() => setInsightLoading(false));
  }, [user, plan]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setAnimateSummary(true);
      const fresh = await refreshAiInsights();
      setInsight(fresh);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (userLoading) return <LoadingSpinner />;

  if (!user) return <UnauthenticatedView />;

  if (!plan) return <LoadingSpinner />;

  if (plan.billing_plan === "free") {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <PageHeader
          icon={faMicrochipAi}
          title="AI Assistant"
          subtitle="Personalized coaching based on your sessions"
          iconBg="bg-violet-400/10"
          iconColor="text-violet-400"
        />
        <div className="px-6 pb-6 flex flex-col gap-8">
          <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/25 px-6 py-5">
            <p className="text-base font-semibold text-slate-100 mb-1">
              Unlock your personal AI typing coach
            </p>
            <p className="text-sm text-slate-400">
              Premium members get weekly AI-generated insights tailored to their
              actual sessions — speed coaching, accuracy analysis, practice
              plans, and more.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 flex gap-4 items-start"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${f.iconBg}`}
                >
                  <FontAwesomeIcon
                    icon={f.icon}
                    className={`w-5 h-5 ${f.iconColor}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100 mb-0.5">
                    {f.title}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-4 w-72">
              <Button
                onClick={() =>
                  window.open(process.env["NEXT_PUBLIC_ACCOUNT_LINK"], "_blank")
                }
              >
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (insightLoading) return <LoadingSpinner />;

  if (!insight) {
    return <EmptyState onRefresh={handleRefresh} refreshing={refreshing} />;
  }

  return (
    <InsightsDashboard
      insight={insight}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      animateSummary={animateSummary}
    />
  );
}
