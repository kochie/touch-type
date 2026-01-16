// Supabase query for getting a goal - uses Edge Function for complex logic
import { getSupabaseClient } from "@/lib/supabase-client";
import type { Goal } from "@/types/supabase";

export async function getGoal(category: string): Promise<Goal | null> {
  const supabase = getSupabaseClient();

  // Use query params by making a fetch call
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/goals?category=${category}`,
    {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch goal');
  }

  return response.json();
}

export async function completeGoal(category: string): Promise<Goal> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/goals?category=${category}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'complete' }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to complete goal');
  }

  return response.json();
}

export async function newGoal(category: string, targetCpm?: number): Promise<Goal> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/goals?category=${category}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'new', targetCpm }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create new goal');
  }

  return response.json();
}
