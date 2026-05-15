"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSettings, useSettingsDispatch } from "@/lib/settings_hook";
import { useSupabase, useUser } from "@/lib/supabase-provider";
import { Field, Label, Description, Switch } from "@headlessui/react";
import clsx from "clsx";

const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

/**
 * `settings.notificationTime` is stored as UTC "HH:MM" because that's what
 * send-notifications compares against. The picker should show the user their
 * LOCAL time (UTC is hostile UX — most users don't know their offset).
 *
 * These helpers do the conversion using today's date as a reference. Using
 * "today" means the conversion is DST-correct for the current local date,
 * which is what users expect for a recurring daily reminder.
 */
function utcHHMMToLocal(utcHHMM: string, tz: string): string {
  if (!/^\d{2}:\d{2}$/.test(utcHHMM)) return utcHHMM;
  const [h, m] = utcHHMM.split(":").map(Number);
  const todayUtc = Temporal.Now.plainDateISO("UTC");
  const utcZdt = todayUtc
    .toPlainDateTime({ hour: h, minute: m })
    .toZonedDateTime("UTC");
  const local = utcZdt.withTimeZone(tz);
  return `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
}

function localHHMMToUtc(localHHMM: string, tz: string): string {
  if (!/^\d{2}:\d{2}$/.test(localHHMM)) return localHHMM;
  const [h, m] = localHHMM.split(":").map(Number);
  const todayLocal = Temporal.Now.plainDateISO(tz);
  const localZdt = todayLocal
    .toPlainDateTime({ hour: h, minute: m })
    .toZonedDateTime(tz);
  const utc = localZdt.withTimeZone("UTC");
  return `${String(utc.hour).padStart(2, "0")}:${String(utc.minute).padStart(2, "0")}`;
}

/**
 * Best-effort short timezone abbreviation (e.g. "AEST", "PDT", "GMT+5:30").
 * Falls back to the IANA name if Intl can't produce a short form.
 */
function tzAbbreviation(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

const DEFAULT_REMINDER_DURATION = 5; // minutes, used for deep link when opening from reminder

type Platform = "macos" | "windows" | "linux";

export function NotificationSettings() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();
  const { supabase } = useSupabase();
  const { user } = useUser();
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [platform, setPlatform] = useState<Platform>("linux");
  const [isPushSupported, setIsPushSupported] = useState(false);

  // Check if we're in Electron environment and get platform info
  useEffect(() => {
    const checkEnvironment = async () => {
      if (typeof window !== "undefined" && window.electronAPI) {
        setIsElectron(true);
        
        try {
          const platformInfo = await window.electronAPI.getPushPlatform();
          setPlatform(platformInfo.platform);
          
          const pushSupported = await window.electronAPI.isPushSupported();
          setIsPushSupported(pushSupported);
        } catch (err) {
          console.error("Failed to get platform info:", err);
        }
      }
    };
    
    checkEnvironment();
  }, []);

  // Save device token to Supabase
  const saveDeviceToken = useCallback(async (
    tokenPlatform: Platform,
    token?: string,
    channelUri?: string
  ) => {
    if (!user) {
      console.warn("No user logged in, cannot save device token");
      return;
    }

    try {
      // Upsert the device token
      const { error: upsertError } = await supabase
        .from("device_tokens")
        .upsert(
          {
            user_id: user.id,
            platform: tokenPlatform,
            token: token || "",
            channel_uri: channelUri || null,
          },
          {
            onConflict: "user_id,platform",
          }
        );

      if (upsertError) {
        console.error("Failed to save device token:", upsertError);
        throw upsertError;
      }

      console.log("Device token saved successfully");
    } catch (err) {
      console.error("Error saving device token:", err);
      throw err;
    }
  }, [user, supabase]);

  // Remove device token from Supabase
  const removeDeviceToken = useCallback(async () => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from("device_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);

      if (deleteError) {
        console.error("Failed to remove device token:", deleteError);
      }
    } catch (err) {
      console.error("Error removing device token:", err);
    }
  }, [user, supabase, platform]);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!window.electronAPI) return;

    setIsScheduling(true);
    setError(null);

    try {
      if (enabled) {
        // For macOS/Windows: Register for push notifications
        if (platform !== "linux" && isPushSupported) {
          const result = await window.electronAPI.registerPushNotifications();
          
          if (result.success) {
            // Save token to Supabase
            await saveDeviceToken(result.platform, result.token, result.channelUri);
            dispatch({ type: "SET_NOTIFICATIONS_ENABLED", enabled: true });
          } else {
            setError(result.error || "Failed to register for push notifications");
            return;
          }
        } else {
          // Linux: Use local scheduler
          const result = await window.electronAPI.scheduleNotification({
            enabled: true,
            time: settings.notificationTime,
            days: settings.notificationDays,
            message: settings.notificationMessage,
            duration: DEFAULT_REMINDER_DURATION,
          });

          if (result.success) {
            dispatch({ type: "SET_NOTIFICATIONS_ENABLED", enabled: true });
          } else {
            setError(result.error || "Failed to schedule notifications");
            return;
          }
        }
      } else {
        // Disable notifications
        if (platform !== "linux") {
          await window.electronAPI.unregisterPushNotifications();
          await removeDeviceToken();
        } else {
          await window.electronAPI.cancelNotification();
        }
        dispatch({ type: "SET_NOTIFICATIONS_ENABLED", enabled: false });
      }
    } catch (err) {
      setError("Failed to update notification settings");
      console.error("Notification error:", err);
    } finally {
      setIsScheduling(false);
    }
  };

  // The picker emits the user's LOCAL time (HH:MM). We store UTC because
  // send-notifications compares against UTC HH:MM. Convert on the boundary.
  const localTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const localTzAbbrev = useMemo(() => tzAbbreviation(localTz), [localTz]);
  const localTimeForDisplay = useMemo(
    () => utcHHMMToLocal(settings.notificationTime, localTz),
    [settings.notificationTime, localTz],
  );

  const handleTimeChange = async (localTime: string) => {
    const utcTime = localHHMMToUtc(localTime, localTz);
    dispatch({ type: "SET_NOTIFICATION_TIME", time: utcTime });
    // Settings are synced to Supabase via settings_hook
    // The server will use the updated time for scheduling
  };

  const handleDaysChange = async (day: string) => {
    const currentDays = settings.notificationDays;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    dispatch({ type: "SET_NOTIFICATION_DAYS", days: newDays });

    // For Linux, re-schedule with new days
    if (platform === "linux" && settings.notificationsEnabled && window.electronAPI) {
      setIsScheduling(true);
      try {
        await window.electronAPI.scheduleNotification({
          enabled: true,
          time: settings.notificationTime,
          days: newDays,
          message: settings.notificationMessage,
          duration: DEFAULT_REMINDER_DURATION,
        });
      } catch (err) {
        console.error("Failed to reschedule:", err);
      } finally {
        setIsScheduling(false);
      }
    }
  };

  // Show a message if not in Electron
  if (!isElectron) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Practice Reminders</h3>
        <p className="text-sm text-gray-400">
          Notification reminders are only available in the desktop app.
        </p>
      </div>
    );
  }

  // Show login required message
  if (!user) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Practice Reminders</h3>
        <p className="text-sm text-gray-400">
          Please sign in to enable push notifications.
        </p>
      </div>
    );
  }

  const getPlatformDescription = () => {
    switch (platform) {
      case "macos":
        return "Push notifications via Apple Push Notification Service";
      case "windows":
        return "Push notifications via Windows Notification Service";
      case "linux":
        return "Local reminders via system scheduler";
      default:
        return "Get notified to practice your typing";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">
          Practice Reminders
        </h3>
        <p className="text-sm text-gray-400">
          {getPlatformDescription()}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Platform indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center px-2 py-1 rounded bg-white/5">
          {platform === "macos" && "macOS (APNS)"}
          {platform === "windows" && "Windows (WNS)"}
          {platform === "linux" && "Linux (Local)"}
        </span>
        {isPushSupported && platform !== "linux" && (
          <span className="text-green-500">Push supported</span>
        )}
      </div>

      {/* Enable/Disable Toggle */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">
            Enable Reminders
          </Label>
          <Description className="text-sm text-gray-500">
            Receive scheduled reminders to practice typing
          </Description>
        </span>
        <Switch
          checked={settings.notificationsEnabled}
          onChange={handleToggleNotifications}
          disabled={isScheduling}
          className={clsx(
            settings.notificationsEnabled ? "bg-indigo-600" : "bg-gray-600",
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full",
            "border-2 border-transparent transition-colors duration-200 ease-in-out",
            "focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
            isScheduling && "opacity-50 cursor-wait"
          )}
        >
          <span
            className={clsx(
              settings.notificationsEnabled ? "translate-x-5" : "translate-x-0",
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            )}
          />
        </Switch>
      </Field>

      {/* Time Picker */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">
            Reminder Time
          </Label>
          <Description className="text-sm text-gray-500">
            When should we remind you? ({localTzAbbrev})
          </Description>
        </span>
        <input
          type="time"
          value={localTimeForDisplay}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={!settings.notificationsEnabled || isScheduling}
          className={clsx(
            "block w-32 rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm text-white",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500",
            (!settings.notificationsEnabled || isScheduling) && "opacity-50"
          )}
        />
      </Field>

      {/* Day Selector */}
      <Field as="div">
        <Label className="text-sm font-medium text-white block mb-2">
          Reminder Days
        </Label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((day) => (
            <button
              key={day.id}
              onClick={() => handleDaysChange(day.id)}
              disabled={!settings.notificationsEnabled || isScheduling}
              className={clsx(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                settings.notificationDays.includes(day.id)
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10",
                (!settings.notificationsEnabled || isScheduling) &&
                  "opacity-50 cursor-not-allowed"
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Status indicator */}
      {settings.notificationsEnabled && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400">
            {platform === "linux" ? (
              <>
                Local reminders scheduled for {localTimeForDisplay} ({localTzAbbrev}) on{" "}
                {settings.notificationDays.length === 7
                  ? "every day"
                  : settings.notificationDays
                      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                      .join(", ")}
              </>
            ) : (
              <>
                Push notifications enabled for {localTimeForDisplay} ({localTzAbbrev}) on{" "}
                {settings.notificationDays.length === 7
                  ? "every day"
                  : settings.notificationDays
                      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                      .join(", ")}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
