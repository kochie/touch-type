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
// import { useEffect } from "react";
// import { gql, useMutation } from "@apollo/client";
// import { useUser } from "@/lib/user_hook";
// import { PUT_SETTINGS } from "@/transactions/putSettings";
import { platform } from "os";
import KeyboardSelect from "../KeyboardSelect";
import clsx from "clsx";


const Settings = () => {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();

  return (
    <div className="grid p-9 grid-cols-2 gap-10">
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
            <option value={Levels.LEVEL_1}>Level 1</option>
            <option value={Levels.LEVEL_2}>Level 2</option>
            <option value={Levels.LEVEL_3}>Level 3</option>
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
                language: e.target.value,
              });
            }}
          >
            <option value={Languages.ENGLISH}>English</option>
            <option value={Languages.GERMAN}>German</option>
            <option value={Languages.FRENCH}>French</option>
            <option value={Languages.SPANISH}>Spanish</option>
          </Select>
        </Field>
      </form>
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

        <PublishSwitch
          enabled={settings.publishToLeaderboard}
          setEnabled={(enabled: boolean) =>
            dispatchSettings({ type: "SET_PUBLISH_TO_LEADERBOARD", publishToLeaderboard: enabled })
          }
        />
      </form>
    </div>
  );
};

export default Settings;

function WhatsNewSwitch({ enabled, setEnabled }) {
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
          Show What&apos;s New on Startup
        </Label>
        <Description as="span" className="text-sm text-gray-500">
          Show the What&apos;s New message when the app starts.
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

function AnalyticsSwitch({ enabled, setEnabled }) {
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
          Enabled Analytics
        </Label>
        <Description as="span" className="text-sm text-gray-500">
          Send tememetry data about usage back to developers.
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

function PublishSwitch({ enabled, setEnabled }) {
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
          Publish to Leaderboard
        </Label>
        <Description as="span" className="text-sm text-gray-500">
          Publish results to the public leaderboard.
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

