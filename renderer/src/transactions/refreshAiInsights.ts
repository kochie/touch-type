import { getSupabaseClient } from '@/lib/supabase-client';
import { getAiInsights } from '@/transactions/getAiInsights';
import type { AiInsight } from '@/types/ai-insights';

export async function refreshAiInsights(): Promise<AiInsight> {
  const supabase = getSupabaseClient();

  const { error: fnError } = await supabase.functions.invoke(
    'generate-ai-insights',
    { body: { force: true } },
  );
  if (fnError) throw fnError;

  // The function only responds after the row is written, so read it back
  // directly. Subscribing to Realtime here would miss the insert, which has
  // already happened by the time invoke() returns.
  const insight = await getAiInsights();
  if (!insight) throw new Error('Analysis finished but no insight was found');
  return insight;
}
