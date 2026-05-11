"use client";

import { useMemo, useState } from "react";
import type { HeatmapKey } from "@/types/ai-insights";
import { KeyboardCanvas } from "@/components/KeyboardCanvas";
import { useSettings } from "@/lib/settings_hook";

interface PopoverInfo {
  key: string;
  avg_ms: number;
  error_rate: number;
  count: number;
}

interface InsightHeatmapProps {
  heatmapData: HeatmapKey[];
}

export function InsightHeatmap({ heatmapData }: InsightHeatmapProps) {
  const { keyboardName } = useSettings();
  const [popover, setPopover] = useState<PopoverInfo | null>(null);

  const { colorMap, keyDataMap } = useMemo(() => {
    if (heatmapData.length === 0) {
      return {
        colorMap: new Map<string, string>(),
        keyDataMap: new Map<string, HeatmapKey>(),
      };
    }

    const maxMs = Math.max(...heatmapData.map((k) => k.avg_ms));
    const minMs = Math.min(...heatmapData.map((k) => k.avg_ms));
    const range = maxMs - minMs || 1;

    const colorMap = new Map<string, string>();
    const keyDataMap = new Map<string, HeatmapKey>();

    for (const k of heatmapData) {
      const t = (k.avg_ms - minMs) / range;
      const r = Math.round(59 + t * (239 - 59));
      const g = Math.round(130 + t * (68 - 130));
      const b = Math.round(246 + t * (68 - 246));
      const errR = Math.round(r + k.error_rate * (239 - r));
      colorMap.set(k.key, `rgb(${errR},${g},${b})`);
      keyDataMap.set(k.key, k);
    }

    return { colorMap, keyDataMap };
  }, [heatmapData]);

  const handleKeyClick = (key: string) => {
    const data = keyDataMap.get(key);
    if (!data) {
      setPopover(null);
      return;
    }
    setPopover(
      popover?.key === key
        ? null
        : { key, avg_ms: data.avg_ms, error_rate: data.error_rate, count: data.count },
    );
  };

  return (
    <div>
      <KeyboardCanvas
        keyboardName={keyboardName}
        colorMap={colorMap}
        onKeyClick={handleKeyClick}
      />

      <div className="flex items-center gap-2 justify-center mt-4">
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

      {popover && (
        <div className="mt-3 mx-auto max-w-xs rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-xs text-slate-200">
          <p className="font-bold uppercase mb-1 text-slate-100">{popover.key}</p>
          <p>
            Avg timing:{" "}
            <span className="font-semibold">{popover.avg_ms}ms</span>
          </p>
          <p>
            Error rate:{" "}
            <span className="font-semibold">
              {(popover.error_rate * 100).toFixed(1)}%
            </span>
          </p>
          <p>
            Total presses:{" "}
            <span className="font-semibold">
              {popover.count.toLocaleString()}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
