"use client";

import { useEffect, useState } from "react";
import {
  Category,
  formatTick,
  formatTooltipValue,
  getCategoryDataKey,
} from "./utils";
import { getRecommendation } from "@/transactions/getRecommendation";
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
import { Skeleton } from "../Skeleton";

interface DataCardProps {
  category: Category;
  icon: IconProp;
  label: string;
}

export function DataCard({ category, icon, label }: DataCardProps) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const data = await getRecommendation(category);
        setRecommendations(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [category]);

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
      {!loading && recommendations.length > 0 ? (
        <ul className="list-disc pl-5 space-y-2">
          {recommendations.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      ) : (
        <div className="pl-5 space-y-2">
          <Skeleton className="h-4 w-[500px]" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[300px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      )}
    </Card>
  );
}
