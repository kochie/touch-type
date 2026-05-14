"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "./supabase-provider";

function detectDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

interface ProfileTimezoneCtx {
  /** Active timezone for client-side date bucketing. Reads
   *  `profiles.timezone` once per user; falls back to the device timezone
   *  while the fetch is in flight or when no profile row exists yet. */
  timezone: string;
}

const Ctx = createContext<ProfileTimezoneCtx>({ timezone: detectDeviceTimezone() });

/**
 * Reads `profiles.timezone` so client-side streak/heatmap bucketing matches
 * the server trigger, AND writes the current device timezone back to the
 * profile when it differs (replaces the old ProfileTimezoneSync). The DB
 * trigger reads profiles.timezone authoritatively; we shadow it for the
 * client so the two never disagree by more than one round-trip.
 */
export function ProfileTimezoneProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user } = useSupabase();
  const [timezone, setTimezone] = useState<string>(detectDeviceTimezone());

  useEffect(() => {
    if (!user) {
      setTimezone(detectDeviceTimezone());
      return;
    }
    let cancelled = false;
    const deviceTz = detectDeviceTimezone();

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const profileTz = data?.timezone ?? null;
      // Prefer profile tz when present; otherwise use device tz.
      setTimezone(profileTz ?? deviceTz);

      // Catch profile up to the device if it differs (or is null).
      if (!error && profileTz !== deviceTz) {
        await supabase.from("profiles").update({ timezone: deviceTz }).eq("id", user.id);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase, user]);

  return <Ctx.Provider value={{ timezone }}>{children}</Ctx.Provider>;
}

export function useProfileTimezone(): string {
  return useContext(Ctx).timezone;
}
