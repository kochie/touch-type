"use client";

import { useQuery } from "@apollo/client";
import {
  Category,
  formatTick,
  formatTooltipValue,
  getCategoryDataKey,
} from "./utils";
import { GET_RECOMMENDATION } from "@/transactions/getRecommendation";
import { Card } from "./Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getChartData } from "./getChartData";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

interface DataCardProps {
  category: Category;
  icon: IconProp;
  label: string;
}

export function DataCard({ category, icon, label }: DataCardProps) {
  const { data, loading, error } = useQuery<{ recommendations: string[] }>(
    GET_RECOMMENDATION,
    {
      variables: { category },
    },
  );

  return (
    <Card
      header={
        <div>
          <h1 className="flex items-center">
            <FontAwesomeIcon icon={icon} className="mr-2 h-4 w-4" />
            {label} Tips
          </h1>
        </div>
      }
    >
      <div className="mb-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getChartData(category)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={formatTick(category)} />
            <Tooltip formatter={formatTooltipValue(category)} />
            <Bar dataKey={getCategoryDataKey(category)} fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data && (
        <ul className="list-disc pl-5 space-y-2">
          {data.recommendations.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
