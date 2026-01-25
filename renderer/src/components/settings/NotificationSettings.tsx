"use client";

import { useState, useEffect } from "react";
import { useSettings, useSettingsDispatch } from "@/lib/settings_hook";
import { Field, Label, Description, Switch, Select } from "@headlessui/react";
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

const DURATIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
];

export function NotificationSettings() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  // Check if we're in Electron environment
  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!window.electronAPI);
  }, []);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!window.electronAPI) return;

    setIsScheduling(true);
    setError(null);

    try {
      const result = await window.electronAPI.scheduleNotification({
        enabled,
        time: settings.notificationTime,
        days: settings.notificationDays,
        message: settings.notificationMessage,
        duration: settings.practiceDuration,
      });

      if (result.success) {
        dispatch({ type: "SET_NOTIFICATIONS_ENABLED", enabled });
      } else {
        setError(result.error || "Failed to schedule notifications");
      }
    } catch (err) {
      setError("Failed to update notification settings");
      console.error("Notification error:", err);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleTimeChange = async (time: string) => {
    dispatch({ type: "SET_NOTIFICATION_TIME", time });

    // Re-schedule if enabled
    if (settings.notificationsEnabled && window.electronAPI) {
      setIsScheduling(true);
      try {
        await window.electronAPI.scheduleNotification({
          enabled: true,
          time,
          days: settings.notificationDays,
          message: settings.notificationMessage,
          duration: settings.practiceDuration,
        });
      } catch (err) {
        console.error("Failed to reschedule:", err);
      } finally {
        setIsScheduling(false);
      }
    }
  };

  const handleDaysChange = async (day: string) => {
    const currentDays = settings.notificationDays;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    dispatch({ type: "SET_NOTIFICATION_DAYS", days: newDays });

    // Re-schedule if enabled
    if (settings.notificationsEnabled && window.electronAPI) {
      setIsScheduling(true);
      try {
        await window.electronAPI.scheduleNotification({
          enabled: true,
          time: settings.notificationTime,
          days: newDays,
          message: settings.notificationMessage,
          duration: settings.practiceDuration,
        });
      } catch (err) {
        console.error("Failed to reschedule:", err);
      } finally {
        setIsScheduling(false);
      }
    }
  };

  const handleDurationChange = async (duration: number) => {
    dispatch({ type: "SET_PRACTICE_DURATION", duration });

    // Re-schedule if enabled
    if (settings.notificationsEnabled && window.electronAPI) {
      setIsScheduling(true);
      try {
        await window.electronAPI.scheduleNotification({
          enabled: true,
          time: settings.notificationTime,
          days: settings.notificationDays,
          message: settings.notificationMessage,
          duration,
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">
          Practice Reminders
        </h3>
        <p className="text-sm text-gray-400">
          Get notified to practice your typing, even when the app is closed.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

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
            When should we remind you?
          </Description>
        </span>
        <input
          type="time"
          value={settings.notificationTime}
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

      {/* Practice Duration */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">
            Practice Duration
          </Label>
          <Description className="text-sm text-gray-500">
            How long should each session be?
          </Description>
        </span>
        <Select
          value={settings.practiceDuration}
          onChange={(e) => handleDurationChange(Number(e.target.value))}
          disabled={!settings.notificationsEnabled || isScheduling}
          className={clsx(
            "block w-32 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
            "*:text-black",
            (!settings.notificationsEnabled || isScheduling) && "opacity-50"
          )}
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>

      {/* Status indicator */}
      {settings.notificationsEnabled && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400">
            Reminders are scheduled for {settings.notificationTime} on{" "}
            {settings.notificationDays.length === 7
              ? "every day"
              : settings.notificationDays
                  .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                  .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
