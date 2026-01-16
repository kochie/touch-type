// Supabase mutation for adding a result
import { getSupabaseClient } from "@/lib/supabase-client";
import type { ResultInsert, Result } from "@/types/supabase";

export async function putResult(result: Omit<ResultInsert, 'user_id'>): Promise<Result> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('results')
    .insert({
      ...result,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
