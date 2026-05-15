"use client";

import { useEffect, useRef } from "react";
import { useSupabase } from "./supabase-provider";
import { useSettings } from "./settings_hook";

/**
 * Bridge between the app's settings/auth state and Electron's APNs/WNS
 * registration. Closes two gaps that the per-component toggle handler doesn't
 * cover:
 *
 * 1. **Auto-register at startup.** When the user previously enabled push
 *    notifications, the OS-side listener and token registration need to be
 *    re-established on every launch. Without this, the app keeps the toggle
 *    visually ON but silently drops any incoming push because no IPC
 *    register call fires. We watch for "user is signed in AND notifications
 *    are enabled" and call registerPushNotifications once per session.
 *
 * 2. **Unregister on sign-out.** When the user logs out, we don't want APNs
 *    to keep delivering to this device under the previous user's tokens.
 *    Watching `user` transitioning from set → null gives us the sign-out
 *    signal; we call unregisterPushNotifications to detach the OS listener.
 *    Best-effort DELETE of the device_token row is also attempted, but it
 *    races the session teardown so we don't block on it.
 *
 * Mounts in Providers alongside IapBridge — runs for the lifetime of the app.
 */
export function PushBridge() {
  const { supabase, user } = useSupabase();
  const settings = useSettings();

  // Tracks the last user id we observed. When it transitions from a value
  // to null, we know a sign-out has just occurred and run cleanup.
  const previousUserIdRef = useRef<string | null>(null);

  // One-shot guard so we don't re-register on every render of this bridge
  // while settings/user references churn. Cleared on sign-out so the next
  // sign-in re-registers fresh.
  const registeredThisSessionRef = useRef(false);

  // Detect sign-out and clean up OS-level push state.
  useEffect(() => {
    const prevUserId = previousUserIdRef.current;
    const currentUserId = user?.id ?? null;

    if (prevUserId && !currentUserId) {
      void (async () => {
        try {
          // OS-level unregister stops APNs from delivering to this device
          // until the next register call.
          await window.electronAPI?.unregisterPushNotifications?.();
        } catch (err) {
          console.error("PushBridge: unregisterPushNotifications failed:", err);
        }

        // Try to remove the device_token row for the previous user. After
        // sign-out the session is gone, so this is best-effort and may 401.
        // Failure is fine — the next sign-in's upsert will replace stale rows.
        try {
          await supabase
            .from("device_tokens")
            .delete()
            .eq("user_id", prevUserId);
        } catch {
          /* best effort */
        }

        registeredThisSessionRef.current = false;
      })();
    }

    previousUserIdRef.current = currentUserId;
  }, [user, supabase]);

  // Auto-register at startup if the user had push enabled previously.
  useEffect(() => {
    if (!user) return;
    if (!settings.notificationsEnabled) return;
    if (registeredThisSessionRef.current) return;
    if (typeof window === "undefined" || !window.electronAPI?.registerPushNotifications) return;

    void (async () => {
      try {
        const platformInfo = await window.electronAPI?.getPushPlatform?.();
        if (!platformInfo || platformInfo.platform === "linux") return;

        const result = await window.electronAPI!.registerPushNotifications!();
        if (!result.success) {
          console.warn("PushBridge: registerPushNotifications failed:", result.error);
          return;
        }

        // Upsert the token in case Apple rotated it or the row was missing.
        await supabase.from("device_tokens").upsert(
          {
            user_id: user.id,
            platform: result.platform,
            token: result.token ?? "",
            channel_uri: result.channelUri ?? null,
          },
          { onConflict: "user_id,platform" },
        );

        registeredThisSessionRef.current = true;
      } catch (err) {
        console.error("PushBridge: auto-register threw:", err);
      }
    })();
  }, [user, settings.notificationsEnabled, supabase]);

  return null;
}
