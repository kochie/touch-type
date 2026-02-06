// Supabase mutation for updating settings
import { getSupabaseClient } from "@/lib/supabase-client";
import { Tables } from "@/types/supabase";

export interface InputSettings {
  analytics: boolean;
  blinker: boolean;
  capital: boolean;
  keyboardName: string;
  language: string;
  levelName: string;
  numbers: boolean;
  publishToLeaderboard: boolean;
  punctuation: boolean;
  theme: string;
  whatsNewOnStartup: boolean;
}

export async function updateSettings(settings: InputSettings): Promise<Tables<"settings">> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Convert camelCase to snake_case
  const dbSettings = {
    user_id: user.id,
    analytics: settings.analytics,
    blinker: settings.blinker,
    capital: settings.capital,
    keyboard_name: settings.keyboardName,
    language: settings.language,
    level_name: settings.levelName,
    numbers: settings.numbers,
    publish_to_leaderboard: settings.publishToLeaderboard,
    punctuation: settings.punctuation,
    theme: settings.theme,
    whats_new_on_startup: settings.whatsNewOnStartup,
  };

  const { data, error } = await supabase
    .from('settings')
    .upsert(dbSettings, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
