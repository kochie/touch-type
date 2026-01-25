// Supabase edge function call for adding a result with leaderboard sync
import { getSupabaseClient } from "@/lib/supabase-client";

export interface KeyPress {
  key: string;
  correct: boolean;
  pressedKey?: string;
  timestamp?: number;
}

export interface ResultInput {
  correct: number;
  incorrect: number;
  time: string;
  datetime: string;
  level: string;
  keyboard: string;
  language: string;
  cpm: number;
  punctuation: boolean;
  capital: boolean;
  numbers: boolean;
  keyPresses: KeyPress[];
}

export interface Result {
  id: string;
  user_id: string;
  correct: number;
  incorrect: number;
  time: string;
  datetime: string;
  level: string;
  keyboard: string;
  language: string;
  cpm: number;
  punctuation: boolean;
  capital: boolean;
  numbers: boolean;
  key_presses: KeyPress[];
  created_at: string;
}

export async function putResult(result: ResultInput): Promise<Result> {
  const supabase = getSupabaseClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  // Use the edge function which handles both result storage and leaderboard sync
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/results`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ result }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to save result');
  }

  return response.json();
}

// Alternative: Direct database insert (does NOT sync with leaderboard)
// Use this only if you don't want automatic leaderboard publishing
export async function putResultDirect(result: ResultInput): Promise<Result> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('results')
    .insert({
      user_id: user.id,
      correct: result.correct,
      incorrect: result.incorrect,
      time: result.time,
      datetime: result.datetime,
      level: result.level,
      keyboard: result.keyboard,
      language: result.language,
      cpm: result.cpm,
      punctuation: result.punctuation,
      capital: result.capital,
      numbers: result.numbers,
      key_presses: result.keyPresses,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Result;
}
