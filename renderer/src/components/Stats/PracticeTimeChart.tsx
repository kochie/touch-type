"use client";

import { useResults } from "@/lib/result-provider";
import {
  getChartData,
  CHART_RANGE_LABELS,
  type ChartDataRange,
} from "@/components/AiAssistant/getChartData";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KeyboardLayoutNames } from "@/keyboards";

interface PracticeTimeChartProps {
  keyboard: KeyboardLayoutNames;
  range: ChartDataRange;
}

export default function PracticeTimeChart({
  keyboard,
  range,
}: PracticeTimeChartProps) {
  const { results } = useResults();
  const filtered = results.filter((r) => r.keyboard === keyboard);
  const rangeParam = range === "all" ? "all" : range;
  const data = getChartData("practice", filtered, rangeParam) as {
    dateString: string;
    name: string;
    minutes: number;
    label: string;
  }[];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Practice time ({CHART_RANGE_LABELS[range]})
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
            <XAxis
              dataKey="dateString"
              interval={0}
              tick={{ fontSize: 9 }}
              tickFormatter={(_, i) => data[i]?.name ?? ""}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} min`} />
            <Tooltip
              content={({ active, label }) => {
                if (!active || label == null) return null;
                const point = data.find((d) => d.dateString === label);
                if (!point) return null;
                const displayTime =
                  point.minutes > 0 ? point.label : "0s";
                return (
                  <div className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 shadow-md">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{point.name}</p>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">
                      Practice: {displayTime}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="minutes" name="Minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
