"use client";

import { useEffect } from "react";
import { useSupabase } from "./supabase-provider";

function detectTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Writes the user's IANA timezone to profiles.timezone whenever the auth
 * state changes. Required by the streak trigger to bucket activity into
 * local calendar days. No-op when logged out or when the browser cannot
 * resolve a zone (very old runtimes).
 */
export function ProfileTimezoneSync() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return;
    const tz = detectTimezone();
    if (!tz) return;

    let cancelled = false;
    (async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ timezone: tz })
        .eq("id", user.id);
      if (error && !cancelled) {
        console.error("Failed to sync profile timezone:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  return null;
}
