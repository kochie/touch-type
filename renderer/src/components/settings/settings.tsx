"use client";

import * as Fathom from "fathom-client";

import {
  ColorScheme,
  Languages,
  Levels,
  useSettings,
  useSettingsDispatch,
} from "@/lib/settings_hook";
import { Description, Field, Label, Select, Switch } from "@headlessui/react";
import { platform } from "os";
import KeyboardSelect from "../KeyboardSelect";
import clsx from "clsx";
import { NotificationSettings } from "./NotificationSettings";
import { CalendarSettings } from "./CalendarSettings";
import { StartupSettings } from "./StartupSettings";
import { DebugSettings } from "./DebugSettings";

export const languages = [
  {
    value: Languages.ENGLISH,
    label: "English",
  },
  {
    value: Languages.FRENCH,
    label: "French",
  },
  {
    value: Languages.GERMAN,
    label: "German",
  },
  {
    value: Languages.SPANISH,
    label: "Spanish",
  },
  {
    value: Languages.MAORI,
    label: "Maori",
  },
];

export const levels = [
  {
    value: Levels.LEVEL_1,
    label: "Level 1",
  },
  {
    value: Levels.LEVEL_2,
    label: "Level 2",
  },
  {
    value: Levels.LEVEL_3,
    label: "Level 3",
  },
  {
    value: Levels.LEVEL_4,
    label: "Level 4",
  },
  {
    value: Levels.LEVEL_5,
    label: "Level 5",
  },
  {
    value: Levels.LEVEL_6,
    label: "Level 6",
  },
];

const Settings = () => {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();

  return (
    <div className="p-9 space-y-10">
      {/* General Settings */}
      <div className="grid grid-cols-2 gap-10">
      <form className="flex flex-col gap-6">
        <KeyboardSelect />

        <Field as="div" className="flex items-center justify-between">
          <span className="flex flex-grow flex-col">
            <Label className="my-auto sm:col-span-2">Level</Label>
            <Description as="span" className="text-sm text-gray-500 mr-3">
              Choose the level of difficulty of the words to type.
            </Description>
          </span>
          <Select
            className={clsx(
              "block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
              // Make the text of each option black on Windows
              "*:text-black",
            )}
            value={settings.levelName}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_LEVEL",
                levelName: e.target.value as Levels,
              });
            }}
          >
            {levels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field as="div" className="flex items-center justify-between">
          <span className="flex flex-grow flex-col">
            <Label>Language</Label>
            <Description as="span" className="text-sm text-gray-500">
              Choose the keyboard of the words to type.
            </Description>
          </span>
          <Select
            className={clsx(
              "block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
              // Make the text of each option black on Windows
              "*:text-black",
            )}
            value={settings.language}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_LANGUAGE",
                language: e.target.value as Languages,
              });
            }}
          >
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </Select>
        </Field>
        <SettingsSwitch 
          enabled={settings.punctuation}
          setEnabled={(enabled) => dispatchSettings({ type: "SET_PUNCTUATION", punctuation: enabled })}
          label="Punctuation"
          description="Include punctuation in the words to type."
        />
        <SettingsSwitch 
          enabled={settings.numbers}
          setEnabled={(enabled) => dispatchSettings({ type: "SET_NUMBERS", numbers: enabled })}
          label="Numbers"
          description="Include numbers in the words to type."
        />
        <SettingsSwitch 
          enabled={settings.capital}
          setEnabled={(enabled) => dispatchSettings({ type: "SET_CAPITAL", capital: enabled })}
          label="Capital"
          description="Include capital letters in the words to type."
        />
      </form>
      <form className="flex flex-col gap-6">
        <SettingsSwitch
          enabled={settings.analytics}
          setEnabled={(enabled) => {
            enabled
              ? Fathom.enableTrackingForMe()
              : Fathom.blockTrackingForMe();
            dispatchSettings({ type: "SET_ANALYTICS", analytics: enabled });
          }}
          label="Enabled Analytics"
          description="Send telemetry data about usage back to developers."
        />

        <SettingsSwitch
          enabled={settings.whatsNewOnStartup}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_WHATS_NEW", whatsnew: enabled })
          }
          label="Show What's New on Startup"
          description="Show the What's New message when the app starts."
        />

        <Field as="div" className="flex items-center justify-between">
          <span className="flex flex-grow flex-col">
            <Label>Theme</Label>
            <Description as="span" className="text-sm text-gray-500">
              Choose the color scheme of the app.
            </Description>
          </span>
          <Select
            className={clsx(
              "block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
              // Make the text of each option black on Windows
              "*:text-black",
            )}
            value={settings.theme}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_COLOR_SCHEME",
                colorScheme: e.target.value as ColorScheme,
              });
            }}
          >
            <option value={ColorScheme.DARK}>Dark</option>
            <option value={ColorScheme.LIGHT}>Light</option>
            <option value={ColorScheme.SYSTEM}>System</option>
          </Select>
        </Field>

        <SettingsSwitch
          enabled={settings.publishToLeaderboard}
          setEnabled={(enabled: boolean) =>
            dispatchSettings({
              type: "SET_PUBLISH_TO_LEADERBOARD",
              publishToLeaderboard: enabled,
            })
          }
          label="Publish to Leaderboard"
          description="Publish results to the public leaderboard."
        />

        <SettingsSwitch
          enabled={settings.blinker}
          setEnabled={(enabled: boolean) =>
            dispatchSettings({ type: "SET_BLINKER", blinker: enabled })
          }
          label="Blinker"
          description="Blink the key being typed."
        />
      </form>
      </div>

      {/* Scheduling Section */}
      <hr className="border-white/10" />
      
      <div className="grid grid-cols-2 gap-10">
        <NotificationSettings />
        <CalendarSettings />
      </div>

      {/* Startup Section */}
      <hr className="border-white/10" />
      
      <div className="grid grid-cols-2 gap-10">
        <StartupSettings />
      </div>

      {/* Debug Section - Only visible in dev mode */}
      <DebugSettings />
    </div>
  );
};

export default Settings;

interface SettingsSwitchProps {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  label: string;
  description: string;
}

function SettingsSwitch({
  enabled,
  setEnabled,
  label,
  description,
}: SettingsSwitchProps) {
  return (
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
          {label}
        </Label>
        <Description as="span" className="text-sm text-gray-500">
          {description}
        </Description>
      </span>
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className={clsx(
          enabled ? "bg-indigo-600" : "bg-gray-200",
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            enabled ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          )}
        />
      </Switch>
    </Field>
  );
}
