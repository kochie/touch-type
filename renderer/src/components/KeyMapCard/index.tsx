"use client";

import { useState, type ReactNode } from "react";
import { KeyboardLayoutNames } from "@/keyboards";
import { KeyboardCanvas } from "@/components/KeyboardCanvas";
import { ChartMessage } from "@/components/Charts/KeyTimingBars";
import { keyLabel } from "@/lib/key-stats";

interface Hover {
  key: string;
  x: number;
  y: number;
}

interface KeyMapCardProps {
  title: string;
  subtitle: ReactNode;
  keyboardName: KeyboardLayoutNames;
  /** Key.key string to CSS colour. Keys left out draw in the resting colour. */
  colorMap: Map<string, string>;
  /** Replaces the keyboard, e.g. while loading or when there is no data. */
  message?: string | null;
  legend?: { from: string; to: string; gradient: string } | null;
  /** Replaces the gradient legend, for maps whose colours are categories. */
  legendContent?: ReactNode;
  /** The body of the hover tooltip for a key. */
  renderTooltip: (key: string) => ReactNode;
}

/** One keyboard map: a titled card with the keyboard, a legend and a hover tooltip. */
export default function KeyMapCard({
  title,
  subtitle,
  keyboardName,
  colorMap,
  message,
  legend,
  legendContent,
  renderTooltip,
}: KeyMapCardProps) {
  const [hover, setHover] = useState<Hover | null>(null);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-fg-muted">{subtitle}</p>

      {message ? (
        <ChartMessage text={message} />
      ) : (
        <>
          <KeyboardCanvas
            keyboardName={keyboardName}
            colorMap={colorMap}
            onKeyHover={setHover}
            fitToKeyboard
          />
          {legendContent && <div className="mt-4">{legendContent}</div>}
          {!legendContent && legend && (
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-fg-muted">
              <span>{legend.from}</span>
              <div className="h-2 w-56 rounded-full" style={{ background: legend.gradient }} />
              <span>{legend.to}</span>
            </div>
          )}
        </>
      )}

      {hover && !message && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="mb-1 font-bold uppercase text-slate-100">{keyLabel(hover.key)}</p>
          {renderTooltip(hover.key)}
        </div>
      )}
    </section>
  );
}
