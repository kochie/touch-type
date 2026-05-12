"use client";

import { useEffect, useRef, useState } from "react";

interface InsightSummaryProps {
  summary: string;
  weekStart: string;
  animate: boolean;
}

export function InsightSummary({
  summary,
  weekStart,
  animate,
}: InsightSummaryProps) {
  const [displayed, setDisplayed] = useState(animate ? "" : summary);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      setDisplayed(summary);
      return;
    }
    setDisplayed("");
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(summary.slice(0, indexRef.current));
      if (indexRef.current >= summary.length) clearInterval(interval);
    }, 12);

    return () => clearInterval(interval);
  }, [summary, animate]);

  const weekLabel = Temporal.PlainDate.from(weekStart).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl bg-slate-800/30 border border-slate-700/40 px-5 py-4">
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {displayed}
        {animate && displayed.length < summary.length && (
          <span className="animate-pulse text-violet-400">|</span>
        )}
      </p>
      <p className="mt-3 text-xs text-slate-500">
        Analysis by Claude · Week of {weekLabel}
      </p>
    </div>
  );
}
