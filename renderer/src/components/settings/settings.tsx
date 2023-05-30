"use client";

import * as Fathom from "fathom-client";

import {
  ColorScheme,
  Languages,
  Levels,
  useSettings,
  useSettingsDispatch,
} from "@/lib/settings_hook";
import { Switch } from "@headlessui/react";
// import { useEffect } from "react";
// import { gql, useMutation } from "@apollo/client";
// import { useUser } from "@/lib/user_hook";
// import { PUT_SETTINGS } from "@/transactions/putSettings";
import { platform } from "os";
import KeyboardSelect from "../KeyboardSelect";
import { KeyboardLayoutNames } from "@/keyboards";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const keyboards = [
  {
    name: "MAC COLEMAK",
    layout: KeyboardLayoutNames.MACOS_US_COLEMAK,
    country: "🇺🇸",
  },
  {
    name: "MAC QWERTY (American)",
    layout: KeyboardLayoutNames.MACOS_US_QWERTY,
    country: "🇺🇸",
  },
  {
    name: "MAC DVORAK",
    layout: KeyboardLayoutNames.MACOS_US_DVORAK,
    country: "🇺🇸",
  },
  {
    name: "MAC AZERTY",
    layout: KeyboardLayoutNames.MACOS_FR_AZERTY,
    country: "🇫🇷",
  },
  {
    name: "MAC AZERTZ",
    layout: KeyboardLayoutNames.MACOS_DE_QWERTZ,
    country: "🇩🇪",
  },
  {
    name: "MAC QWERTY (Spanish)",
    layout: KeyboardLayoutNames.MACOS_ES_QWERTY,
    country: "🇪🇸",
  },
];

const Settings = () => {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();

  return (
    <div className="flex p-9">
      <form className="flex flex-col gap-6">
        <AnalyticsSwitch
          enabled={settings.analytics}
          setEnabled={(enabled) => {
            enabled
              ? Fathom.enableTrackingForMe()
              : Fathom.blockTrackingForMe();
            dispatchSettings({ type: "SET_ANALYTICS", analytics: enabled });
          }}
        />

        <WhatsNewSwitch
          enabled={settings.whatsNewOnStartup}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_WHATS_NEW", whatsnew: enabled })
          }
        />

        <KeyboardSelect
          sel={keyboards.find(keyboard => keyboard.layout === settings.keyboardName)}
          setSelected={(selectedValue) => {
            dispatchSettings({
              type: "CHANGE_KEYBOARD",
              keyboardName: selectedValue,
            });
          }}
          keyboards={keyboards}
        />

        <label>
          Level
          <select
            className="text-black ml-5"
            value={settings.levelName}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_LEVEL",
                levelName: e.target.value,
              });
            }}
          >
            <option value={Levels.LEVEL_1}>Level 1</option>
            <option value={Levels.LEVEL_2}>Level 2</option>
            <option value={Levels.LEVEL_3}>Level 3</option>
          </select>
        </label>

        <label>
          Theme
          <select
            className="text-black ml-5"
            value={settings.prefersColorScheme}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_COLOR_SCHEME",
                colorScheme: e.target.value,
              });
            }}
          >
            <option value={ColorScheme.DARK}>Dark</option>
            <option value={ColorScheme.LIGHT}>Light</option>
            <option value={ColorScheme.SYSTEM}>System</option>
          </select>
        </label>

        <label>
          Language
          <select
            className="text-black ml-5"
            value={settings.language}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_LANGUAGE",
                language: e.target.value,
              });
            }}
          >
            <option value={Languages.ENGLISH}>English</option>
            <option value={Languages.GERMAN}>German</option>
            <option value={Languages.FRENCH}>French</option>
            <option value={Languages.SPANISH}>Spanish</option>
          </select>
        </label>
      </form>
    </div>
  );
};

export default Settings;

function WhatsNewSwitch({ enabled, setEnabled }) {
  return (
    <Switch.Group as="div" className="flex items-center justify-between">
      <span className="flex flex-grow flex-col">
        <Switch.Label
          as="span"
          className={classNames(
            "text-sm font-medium leading-6",
            platform() === "darwin" ? "text-white" : ""
          )}
          passive
        >
          Show What&apos;s New on Startup
        </Switch.Label>
        <Switch.Description as="span" className="text-sm text-gray-500">
          Show the What&apos;s New message when the app starts.
        </Switch.Description>
      </span>
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className={classNames(
          enabled ? "bg-indigo-600" : "bg-gray-200",
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            enabled ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
    </Switch.Group>
  );
}

function AnalyticsSwitch({ enabled, setEnabled }) {
  return (
    <Switch.Group as="div" className="flex items-center justify-between">
      <span className="flex flex-grow flex-col">
        <Switch.Label
          as="span"
          className={classNames(
            "text-sm font-medium leading-6",
            platform() === "darwin" ? "text-white" : ""
          )}
          passive
        >
          Enabled Analytics
        </Switch.Label>
        <Switch.Description as="span" className="text-sm text-gray-500">
          Send tememetry data about usage back to developers.
        </Switch.Description>
      </span>
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className={classNames(
          enabled ? "bg-indigo-600" : "bg-gray-200",
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            enabled ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
    </Switch.Group>
  );
}
