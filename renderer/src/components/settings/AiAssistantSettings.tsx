"use client";

import { useSettings, useSettingsDispatch } from "@/lib/settings_hook";
import { Description, Field, Label, Switch } from "@headlessui/react";
import { platform } from "os";
import clsx from "clsx";

export function AiAssistantSettings() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();

  return (
    <div className="flex flex-col gap-6">
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label
            as="span"
            className={clsx(
              "text-sm font-medium leading-6",
              platform() === "darwin" ? "text-white" : "",
            )}
            passive
          >
            Weekly email report
          </Label>
          <Description as="span" className="text-sm text-gray-500">
            Receive a weekly AI coaching digest. Active weeks get a full report; quieter weeks get a top tip.
          </Description>
        </span>
        <Switch
          checked={settings.aiWeeklyEmail}
          onChange={(enabled) =>
            dispatch({ type: "SET_AI_WEEKLY_EMAIL", aiWeeklyEmail: enabled })
          }
          className={clsx(
            settings.aiWeeklyEmail
              ? "bg-sky-500"
              : "bg-slate-200 dark:bg-slate-700",
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-transparent",
          )}
        >
          <span
            aria-hidden="true"
            className={clsx(
              settings.aiWeeklyEmail ? "translate-x-5" : "translate-x-0",
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            )}
          />
        </Switch>
      </Field>
    </div>
  );
}
