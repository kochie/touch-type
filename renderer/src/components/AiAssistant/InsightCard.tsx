"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoltLightning,
  faBullseye,
  faCoffee,
  faKeyboard,
  faMusicNote,
} from "@fortawesome/pro-duotone-svg-icons";
import type { InsightCard as InsightCardType } from "@/types/ai-insights";

const CATEGORY_META = {
  speed: {
    icon: faBoltLightning,
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-400/10",
  },
  accuracy: {
    icon: faBullseye,
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10",
  },
  ergonomics: {
    icon: faCoffee,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-400/10",
  },
  practice: {
    icon: faKeyboard,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
  },
  rhythm: {
    icon: faMusicNote,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-400/10",
  },
} as const;

function DeltaBadge({ delta }: { delta: string }) {
  if (!delta) return null;
  const isPositive = delta.startsWith("+");
  const isNegative = delta.startsWith("-");
  return (
    <span
      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
        isPositive
          ? "bg-green-400/10 text-green-400"
          : isNegative
            ? "bg-red-400/10 text-red-400"
            : "bg-slate-400/10 text-slate-400"
      }`}
    >
      {delta}
    </span>
  );
}

export function InsightCard({ card }: { card: InsightCardType }) {
  const meta = CATEGORY_META[card.category];

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}
        >
          <FontAwesomeIcon
            icon={meta.icon}
            className={`w-4 h-4 ${meta.iconColor}`}
          />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {card.category}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-100 mb-1">{card.title}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{card.body}</p>
      </div>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-2xl font-bold text-slate-100">{card.metric}</span>
        <DeltaBadge delta={card.delta} />
      </div>
    </div>
  );
}
