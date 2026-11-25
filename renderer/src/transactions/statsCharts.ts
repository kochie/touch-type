import { getSupabaseClient } from '@/lib/supabase-client';

export interface KeyTimingRow {
  key: string;
  avg_ms: number;
  error_rate: number;
  presses: number;
}

export interface SpeedBucket {
  from: number;
  to: number;
  users: number;
}

export interface SpeedDistribution {
  you: { avg_wpm: number; sessions: number; percentile: number | null } | null;
  population: {
    users: number;
    mean_wpm: number;
    std_wpm: number;
    buckets: SpeedBucket[];
  } | null;
}

/** Thrown when the database refuses a premium-only stat. */
export class PremiumRequiredError extends Error {
  constructor() {
    super('Premium required');
  }
}

// 42501 = insufficient_privilege, raised by the stats_* functions for non-premium users.
function rethrow(error: { code?: string; message: string }): never {
  if (error.code === '42501') throw new PremiumRequiredError();
  throw new Error(error.message);
}

/** Average time to reach each letter, slowest first. `days` null = all time. */
export async function getKeyTiming(
  days: number | null,
  keyboard: string,
): Promise<KeyTimingRow[]> {
  const { data, error } = await getSupabaseClient().rpc('stats_key_timing', {
    p_days: days ?? undefined,
    p_keyboard: keyboard,
  });
  if (error) rethrow(error);
  return (data ?? []).map((r) => ({
    key: r.key,
    avg_ms: Number(r.avg_ms),
    error_rate: Number(r.error_rate),
    presses: Number(r.presses),
  }));
}

/** Your average speed against everyone's. `days` null = all time. */
export async function getSpeedDistribution(
  days: number | null,
): Promise<SpeedDistribution> {
  const { data, error } = await getSupabaseClient().rpc(
    'stats_speed_distribution',
    { p_days: days ?? undefined },
  );
  if (error) rethrow(error);
  return data as unknown as SpeedDistribution;
}
