// Supabase function call for getting recommendations
import { getSupabaseClient } from "@/lib/supabase-client";

export async function getRecommendation(category: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  const {data, error} = await supabase.functions.invoke('recommendations', {
    body: {
      category: category,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
