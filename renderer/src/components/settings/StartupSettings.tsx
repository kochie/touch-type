"use client";

import { useEffect, useState } from "react";
import { useSettings, useSettingsDispatch } from "@/lib/settings_hook";
import { Description, Field, Label, Switch } from "@headlessui/react";
import clsx from "clsx";
import { platform } from "os";

export function StartupSettings() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if we're running in Electron
  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!window.electronAPI);
    
    // Load initial settings from Electron
    const loadSettings = async () => {
      if (typeof window !== "undefined" && window.electronAPI) {
        try {
          const loginSettings = await window.electronAPI.getLoginItemSettings();
          
          // Sync with local state if different
          if (loginSettings.openAtLogin !== settings.launchAtStartup) {
            dispatchSettings({
              type: "SET_LAUNCH_AT_STARTUP",
              enabled: loginSettings.openAtLogin,
            });
          }
          if (loginSettings.startMinimized !== settings.startMinimized) {
            dispatchSettings({
              type: "SET_START_MINIMIZED",
              enabled: loginSettings.startMinimized,
            });
          }
        } catch (error) {
          console.error("Failed to load startup settings:", error);
        }
      }
      setIsLoading(false);
    };

    loadSettings();
  }, []);

  const handleLaunchAtStartupChange = async (enabled: boolean) => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.setLaunchAtStartup(enabled);
      if (result.success) {
        dispatchSettings({
          type: "SET_LAUNCH_AT_STARTUP",
          enabled,
        });
      } else {
        console.error("Failed to set launch at startup:", result.error);
      }
    } catch (error) {
      console.error("Failed to set launch at startup:", error);
    }
  };

  const handleStartMinimizedChange = async (enabled: boolean) => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.setStartMinimized(enabled);
      if (result.success) {
        dispatchSettings({
          type: "SET_START_MINIMIZED",
          enabled,
        });
      } else {
        console.error("Failed to set start minimized:", result.error);
      }
    } catch (error) {
      console.error("Failed to set start minimized:", error);
    }
  };

  // Don't show on web
  if (!isElectron) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium leading-6 text-white">
          Startup Settings
        </h3>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium leading-6 text-white">
          Startup Settings
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Configure how the app behaves when your computer starts.
        </p>
      </div>

      <div className="space-y-4">
        <Field as="div" className="flex items-center justify-between">
          <span className="flex grow flex-col">
            <Label
              as="span"
              className={clsx(
                "text-sm font-medium leading-6",
                platform() === "darwin" ? "text-white" : ""
              )}
              passive
            >
              Launch at Startup
            </Label>
            <Description as="span" className="text-sm text-gray-500">
              Automatically start Touch Typer when you log in to your computer.
            </Description>
          </span>
          <Switch
            checked={settings.launchAtStartup}
            onChange={handleLaunchAtStartupChange}
            className={clsx(
              settings.launchAtStartup ? "bg-indigo-600" : "bg-gray-200",
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                settings.launchAtStartup ? "translate-x-5" : "translate-x-0",
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              )}
            />
          </Switch>
        </Field>

        <Field as="div" className="flex items-center justify-between">
          <span className="flex grow flex-col">
            <Label
              as="span"
              className={clsx(
                "text-sm font-medium leading-6",
                platform() === "darwin" ? "text-white" : "",
                !settings.launchAtStartup ? "opacity-50" : ""
              )}
              passive
            >
              Start Minimized
            </Label>
            <Description
              as="span"
              className={clsx(
                "text-sm text-gray-500",
                !settings.launchAtStartup ? "opacity-50" : ""
              )}
            >
              Start the app hidden in the system tray instead of showing the
              window.
            </Description>
          </span>
          <Switch
            checked={settings.startMinimized}
            onChange={handleStartMinimizedChange}
            disabled={!settings.launchAtStartup}
            className={clsx(
              settings.startMinimized && settings.launchAtStartup
                ? "bg-indigo-600"
                : "bg-gray-200",
              !settings.launchAtStartup
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer",
              "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                settings.startMinimized && settings.launchAtStartup
                  ? "translate-x-5"
                  : "translate-x-0",
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              )}
            />
          </Switch>
        </Field>
      </div>
    </div>
  );
}
