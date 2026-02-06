// Supabase query for getting a goal - uses Edge Function for complex logic
import { getSupabaseClient } from "@/lib/supabase-client";
import { Tables } from "@/types/supabase";

export async function getGoal(category: string): Promise<Tables<"goals"> | null> {
  const supabase = getSupabaseClient();

  const {data, error} = await supabase.functions.invoke('goals', {
    body: {
      category: category,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function completeGoal(category: string): Promise<Tables<"goals">> {
  const supabase = getSupabaseClient();

  const {data, error} = await supabase.functions.invoke('goals', {
    body: {
      category: category,
      action: 'complete',
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function newGoal(category: string, targetCpm?: number): Promise<Tables<"goals">> {
  const supabase = getSupabaseClient();

  const {data, error} = await supabase.functions.invoke('goals', {
    body: {
      category: category,
      action: 'new',
      targetCpm: targetCpm,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
