"use client";

import { useResults } from "@/lib/result-provider";
import {
  getChartData,
  CHART_RANGE_LABELS,
  type ChartDataRange,
} from "@/components/AiAssistant/getChartData";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KeyboardLayoutNames } from "@/keyboards";

interface CpmAccuracyTrendChartProps {
  keyboard: KeyboardLayoutNames;
  range: ChartDataRange;
}

export default function CpmAccuracyTrendChart({
  keyboard,
  range,
}: CpmAccuracyTrendChartProps) {
  const { results } = useResults();
  const filtered = results.filter((r) => r.keyboard === keyboard);
  const rangeParam = range === "all" ? "all" : range;

  const speedData = getChartData("speed", filtered, rangeParam) as {
    dateString: string;
    name: string;
    wpm: number;
  }[];
  const accuracyData = getChartData("accuracy", filtered, rangeParam) as {
    dateString: string;
    name: string;
    accuracy: number;
  }[];

  const combined = speedData.map((s, i) => ({
    dateString: s.dateString,
    name: s.name,
    cpm: s.wpm,
    accuracy: accuracyData[i]?.accuracy ?? 0,
  }));

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
        CPM & accuracy trend ({CHART_RANGE_LABELS[range]})
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combined} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
            <XAxis
              dataKey="dateString"
              interval={0}
              tick={{ fontSize: 9 }}
              tickFormatter={(_, i) => combined[i]?.name ?? ""}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "accuracy" ? `${value}%` : value
              }
              labelFormatter={(dateString) =>
                combined.find((d) => d.dateString === dateString)?.name ?? dateString
              }
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cpm"
              name="CPM"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="accuracy"
              name="Accuracy %"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
