"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const TIP_WIDTH = 208;
const EDGE = 8;

interface HoverTipProps {
  name: string;
  description: string;
  earn: string;
  /** Progress towards a locked item, shown dimmed under the instructions. */
  progress?: string | null;
  children: ReactNode;
}

interface Placement {
  left: number;
  top: number;
  below: boolean;
}

/**
 * Tooltip rendered in a portal with fixed positioning, so a modal's overflow
 * can't clip it. Shown on pointer hover and keyboard focus only (not after a click).
 */
export function HoverTip({ name, description, earn, progress, children }: HoverTipProps) {
  const [place, setPlace] = useState<Placement | null>(null);

  const open = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const below = rect.top < 150;
    const left = Math.min(
      Math.max(EDGE, rect.left + rect.width / 2 - TIP_WIDTH / 2),
      window.innerWidth - TIP_WIDTH - EDGE,
    );
    setPlace({ left, top: below ? rect.bottom + 8 : rect.top - 8, below });
  };
  const close = () => setPlace(null);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={(e) => open(e.currentTarget)}
      onMouseLeave={close}
      onFocus={(e) => e.target.matches(":focus-visible") && open(e.currentTarget)}
      onBlur={close}
    >
      {children}
      {place &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              left: place.left,
              top: place.top,
              width: TIP_WIDTH,
              transform: place.below ? undefined : "translateY(-100%)",
            }}
            className="pointer-events-none z-[200] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left shadow-xl"
          >
            <span className="block text-[11px] font-semibold text-slate-100">{name}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{description}</span>
            <span className="mt-1.5 block text-[11px] leading-snug text-amber-300">{earn}</span>
            {progress && <span className="mt-0.5 block text-[10px] text-slate-500">{progress}</span>}
          </span>,
          document.body,
        )}
    </span>
  );
}
