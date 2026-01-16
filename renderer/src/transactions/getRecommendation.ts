// Supabase function call for getting recommendations
import { getSupabaseClient } from "@/lib/supabase-client";

export async function getRecommendation(category: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return [];
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recommendations?category=${category}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.error('Failed to fetch recommendations');
    return [];
  }

  return response.json();
}
