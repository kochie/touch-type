export type InsightCategory =
  | 'speed'
  | 'accuracy'
  | 'ergonomics'
  | 'practice'
  | 'rhythm';

export interface InsightCard {
  category: InsightCategory;
  title: string;
  body: string;
  metric: string;
  delta: string;
}

export interface HeatmapKey {
  key: string;
  avg_ms: number;
  error_rate: number;
  count: number;
}

export interface AiInsight {
  id: string;
  user_id: string;
  generated_at: string;
  week_start: string;
  summary: string;
  insight_cards: InsightCard[];
  heatmap_data: HeatmapKey[];
  sessions_count: number;
  model_version: string;
  created_at: string;
}
