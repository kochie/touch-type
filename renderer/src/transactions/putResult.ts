// Supabase mutation for adding a result
import { getSupabaseClient } from "@/lib/supabase-client";
import { Tables } from "@/types/supabase";

export async function putResult(result: Omit<Tables<"results">, 'user_id'>): Promise<Tables<"results">> {
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
