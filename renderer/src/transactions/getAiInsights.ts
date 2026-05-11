import { getSupabaseClient } from '@/lib/supabase-client';
import type { AiInsight } from '@/types/ai-insights';

export async function getAiInsights(): Promise<AiInsight | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown as AiInsight) ?? null;
}
