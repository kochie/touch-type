"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinnerThird, faDumbbell } from "@fortawesome/pro-duotone-svg-icons";
import { faArrowRight } from "@fortawesome/pro-regular-svg-icons";
import ReactMarkdown from "react-markdown";
import type { AiInsight } from "@/types/ai-insights";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { useWords } from "@/lib/word-provider";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface DrillResult {
  words: string[];
  focus_keys: string[];
  rationale: string;
}

const STATIC_SUGGESTIONS = [
  "What were my biggest wins this week?",
  "Which keys need the most work?",
  "What's holding back my speed?",
  "Why am I making so many errors?",
  "How consistent is my rhythm?",
  "What should I focus on next?",
  "Can you summarise my progress?",
];

function keyBadgeColor(errorRate: number) {
  if (errorRate > 0.15) return "bg-red-800/60 text-red-300 border border-red-700/50";
  if (errorRate > 0.08) return "bg-amber-800/60 text-amber-300 border border-amber-700/50";
  return "bg-slate-700/60 text-slate-300 border border-slate-600/50";
}

function buildContext(insight: AiInsight) {
  return {
    summary: insight.summary,
    insight_cards: insight.insight_cards,
    heatmap_data: insight.heatmap_data,
    week_start: insight.week_start,
    sessions_count: insight.sessions_count,
  };
}

export function AssistantChat({ insight }: { insight: AiInsight }) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [, setCustomWordList] = useWords();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const callChat = useCallback(async (newMessages: Message[]) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-coach-chat", {
        body: { messages: newMessages, context: buildContext(insight) },
      });
      if (fnError) {
        const body = await (fnError as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? fnError.message);
      }
      setMessages([...newMessages, { role: "assistant" as const, content: data.reply }]);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [insight, supabase]);

  // Initial greeting on mount
  useEffect(() => {
    callChat([]);
  }, [callChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSuggestion = (label: string) => {
    const next = [...messages, { role: "user" as const, content: label }];
    setMessages(next);
    callChat(next);
  };

  const generateDrill = useCallback(async () => {
    setDrillLoading(true);
    setDrillError(null);
    setDrill(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-custom-drill", {
        body: {},
      });
      if (fnError) {
        const body = await (fnError as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? fnError.message);
      }
      setDrill(data as DrillResult);
    } catch (err: any) {
      setDrillError(err?.message ?? "Failed to generate drill.");
    } finally {
      setDrillLoading(false);
    }
  }, [supabase]);

  const startDrill = useCallback(() => {
    if (!drill) return;
    setCustomWordList(drill.words, { focus_keys: drill.focus_keys, rationale: drill.rationale });
    router.push("/");
  }, [drill, setCustomWordList, router]);

  const focusKeys = [...insight.heatmap_data]
    .filter(k => k.count > 0)
    .sort((a, b) => b.error_rate - a.error_rate)
    .slice(0, 3);

  const bestCard = insight.insight_cards
    .filter(c => c.delta.startsWith("+"))
    .sort((a, b) => parseFloat(b.delta) - parseFloat(a.delta))[0]
    ?? insight.insight_cards[0];

  const recommendations = insight.insight_cards.slice(0, 3).map((c, i) => ({
    text: c.body.split(".")[0] + ".",
    color: ["bg-sky-400", "bg-green-400", "bg-amber-400"][i],
  }));

  return (
    <div className="flex gap-0">
      {/* Chat panel */}
      <div className="flex flex-col flex-1 min-w-0 p-4 gap-3">
        <div ref={scrollRef} className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mx-1">
                {msg.role === "assistant" ? "Assistant" : "You"}
              </span>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-slate-700/60 border border-slate-600/40 text-slate-200"
                  : "bg-slate-600/50 border border-slate-500/30 text-slate-100"
              }`}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                      code: ({ children }) => <code className="font-mono text-xs bg-slate-600/60 rounded px-1 py-0.5 text-violet-300">{children}</code>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-slate-200">{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="rounded-2xl px-4 py-2.5 bg-slate-700/60 border border-slate-600/40">
                <FontAwesomeIcon icon={faSpinnerThird} spin className="w-3.5 h-3.5 text-violet-400" />
              </div>
            </div>
          )}
        </div>

        {/* Static coaching question chips */}
        {!loading && (
          <div className="flex flex-wrap gap-1.5">
            {STATIC_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-left text-xs text-sky-300 bg-sky-400/5 border border-sky-400/20 rounded-lg px-3 py-1.5 hover:bg-sky-400/10 hover:border-sky-400/40 transition-all duration-150 cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => callChat(messages)}
              className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Custom drill section */}
        <div className="border-t border-slate-700/40 pt-3">
          {!drill && !drillLoading && (
            <button
              onClick={generateDrill}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-violet-300 bg-violet-400/5 border border-violet-400/20 rounded-xl px-4 py-2.5 hover:bg-violet-400/10 hover:border-violet-400/40 transition-all duration-150 cursor-pointer"
            >
              <FontAwesomeIcon icon={faDumbbell} className="w-3.5 h-3.5" />
              Generate practice drill
            </button>
          )}

          {drillLoading && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400">
              <FontAwesomeIcon icon={faSpinnerThird} spin className="w-3.5 h-3.5 text-violet-400" />
              Analysing your keystrokes…
            </div>
          )}

          {drillError && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-red-400">{drillError}</p>
              <button onClick={generateDrill} className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer">Retry</button>
            </div>
          )}

          {drill && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Your drill is ready</p>
              <div className="flex gap-1.5 flex-wrap">
                {drill.focus_keys.map(k => (
                  <span key={k} className="px-2 py-0.5 rounded-lg text-xs font-bold bg-violet-800/50 text-violet-300 border border-violet-700/40">
                    {k.toUpperCase()}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{drill.rationale}</p>
              <p className="text-[11px] text-slate-500">{drill.words.length} words generated</p>
              <button
                onClick={startDrill}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 bg-violet-400 hover:bg-violet-300 rounded-xl px-4 py-2 transition-all duration-150 cursor-pointer"
              >
                Start drill
                <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDrill(null)}
                className="text-xs text-slate-500 hover:text-slate-400 text-center cursor-pointer"
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-48 flex-shrink-0 border-l border-slate-700/40 p-4 flex flex-col gap-3">
        {bestCard && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">This Week</p>
            <p className="text-xl font-bold text-slate-100">{bestCard.metric}</p>
            <p className="text-[11px] text-slate-400">{bestCard.title.toLowerCase()}</p>
            {bestCard.delta && (
              <span className={`mt-0.5 text-[11px] font-semibold self-start px-1.5 py-0.5 rounded-full ${
                bestCard.delta.startsWith("+") ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
              }`}>
                {bestCard.delta}
              </span>
            )}
          </div>
        )}

        {focusKeys.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Focus Keys</p>
            <div className="flex gap-1.5 flex-wrap">
              {focusKeys.map(k => (
                <span
                  key={k.key}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${keyBadgeColor(k.error_rate)}`}
                >
                  {k.key.toUpperCase()}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">High error rate</p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Recommendations</p>
            <div className="flex flex-col gap-2">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${r.color}`} />
                  <p className="text-[11px] text-slate-300 leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
