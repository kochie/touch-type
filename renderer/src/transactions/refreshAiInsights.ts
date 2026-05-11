import { getSupabaseClient } from '@/lib/supabase-client';
import type { AiInsight } from '@/types/ai-insights';

export async function refreshAiInsights(): Promise<AiInsight> {
  const supabase = getSupabaseClient();

  const { error: fnError } = await supabase.functions.invoke(
    'generate-ai-insights',
    { body: { force: true } },
  );
  if (fnError) throw fnError;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.unsubscribe();
      reject(new Error('Refresh timed out after 60s'));
    }, 60_000);

    const channel = supabase
      .channel('ai_insights_refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_insights' },
        (payload) => {
          clearTimeout(timeout);
          channel.unsubscribe();
          resolve(payload.new as AiInsight);
        },
      )
      .subscribe();
  });
}
