// Supabase query for getting results
// This file is kept for reference but results are now fetched directly in result-provider.tsx

import { getSupabaseClient } from "@/lib/supabase-client";
import type { Result } from "@/types/supabase";

export interface GetResultsParams {
  since?: string;
  limit?: number;
  offset?: number;
}

export interface GetResultsResponse {
  results: Result[];
  hasMore: boolean;
}

export async function getResults(params: GetResultsParams = {}): Promise<GetResultsResponse> {
  const supabase = getSupabaseClient();
  const { since, limit = 100, offset = 0 } = params;

  let query = supabase
    .from('results')
    .select('*')
    .order('datetime', { ascending: false })
    .range(offset, offset + limit - 1);

  if (since) {
    query = query.gt('datetime', since);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    results: data || [],
    hasMore: (data?.length || 0) === limit,
  };
}
