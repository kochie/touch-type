"use client";

import { useMemo, useState } from "react";
import type { HeatmapKey } from "@/types/ai-insights";
import { KeyboardCanvas } from "@/components/KeyboardCanvas";
import { useSettings } from "@/lib/settings_hook";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";

interface InsightHeatmapProps {
  heatmapData: HeatmapKey[];
}

interface Hover {
  key: string;
  x: number;
  y: number;
}

export function InsightHeatmap({ heatmapData }: InsightHeatmapProps) {
  const { keyboardName: settingsKeyboard } = useSettings();
  const fallbackKeyboard = settingsKeyboard ?? KeyboardLayoutNames.MACOS_US_QWERTY;

  // Entries are tagged with the layout they were typed on. Older insights have
  // no tag; those belong to the user's current layout.
  const byKeyboard = useMemo(() => {
    const map = new Map<KeyboardLayoutNames, HeatmapKey[]>();
    for (const k of heatmapData) {
      const kb = (k.keyboard as KeyboardLayoutNames | undefined) ?? fallbackKeyboard;
      map.set(kb, [...(map.get(kb) ?? []), k]);
    }
    return map;
  }, [heatmapData, fallbackKeyboard]);

  const layoutsWithData = useMemo(
    () => new Set(byKeyboard.keys()),
    [byKeyboard],
  );

  const [picked, setPicked] = useState<KeyboardLayoutNames | null>(null);
  const selectedKeyboard =
    picked ??
    (layoutsWithData.has(fallbackKeyboard)
      ? fallbackKeyboard
      : (layoutsWithData.values().next().value ?? fallbackKeyboard));

  const [hover, setHover] = useState<Hover | null>(null);

  const { colorMap, keyDataMap } = useMemo(() => {
    const entries = byKeyboard.get(selectedKeyboard) ?? [];
    const colorMap = new Map<string, string>();
    const keyDataMap = new Map<string, HeatmapKey>();
    if (entries.length === 0) return { colorMap, keyDataMap };

    const maxMs = Math.max(...entries.map((k) => k.avg_ms));
    const minMs = Math.min(...entries.map((k) => k.avg_ms));
    const range = maxMs - minMs || 1;

    for (const k of entries) {
      const t = (k.avg_ms - minMs) / range;
      const r = Math.round(59 + t * (239 - 59));
      const g = Math.round(130 + t * (68 - 130));
      const b = Math.round(246 + t * (68 - 246));
      const errR = Math.round(r + k.error_rate * (239 - r));
      colorMap.set(k.key, `rgb(${errR},${g},${b})`);
      keyDataMap.set(k.key, k);
    }
    return { colorMap, keyDataMap };
  }, [byKeyboard, selectedKeyboard]);

  const hovered = hover ? keyDataMap.get(hover.key) : undefined;

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <KeyboardSelect
          selectedKeyboardName={selectedKeyboard}
          setSelectedKeyboard={setPicked}
          label="Keyboard layout"
          description=""
          enabledLayouts={layoutsWithData}
        />
      </div>

      <KeyboardCanvas
        keyboardName={selectedKeyboard}
        colorMap={colorMap}
        onKeyHover={setHover}
        fitToKeyboard
      />

      <div className="flex items-center gap-2 justify-center mt-2">
        <span className="text-xs text-slate-500">Fast</span>
        <div
          className="w-24 h-2 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgb(59,130,246), rgb(239,68,68))",
          }}
        />
        <span className="text-xs text-slate-500">Slow</span>
      </div>

      {hover && hovered && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-bold uppercase mb-1 text-slate-100">{hover.key}</p>
          <p>
            Avg timing: <span className="font-semibold">{hovered.avg_ms}ms</span>
          </p>
          <p>
            Error rate:{" "}
            <span className="font-semibold">
              {(hovered.error_rate * 100).toFixed(1)}%
            </span>
          </p>
          <p>
            Total presses:{" "}
            <span className="font-semibold">
              {hovered.count.toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
