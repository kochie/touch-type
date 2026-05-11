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
import { LANGUAGES } from "@/lib/languages";
import { NotificationSettings } from "./NotificationSettings";
import { CalendarSettings } from "./CalendarSettings";
import { StartupSettings } from "./StartupSettings";
import { DebugSettings } from "./DebugSettings";
import { CodeSettings } from "./CodeSettings";
import PageHeader from "../PageHeader";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useState, useRef, useEffect } from "react";
import { keyboards } from "../KeyboardSelect";
import { useTranslation } from "react-i18next";
import { detectAppLanguage } from "@/lib/locale-detect";

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

type SettingsCategoryId =
  | "appearance"
  | "keyboard"
  | "practice"
  | "notifications"
  | "account"
  | "about";

const SETTINGS_CATEGORIES: SettingsCategoryId[] = [
  "appearance",
  "keyboard",
  "practice",
  "notifications",
  "account",
  "about",
];

// ── Panel components ──────────────────────────────────────────────────────────

function AppearanceSettings() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  const { t } = useTranslation();

  return (
    <form className="flex flex-col gap-6">
      <SettingsSwitch
        enabled={settings.analytics}
        setEnabled={(enabled) => {
          enabled
            ? Fathom.enableTrackingForMe()
            : Fathom.blockTrackingForMe();
          dispatchSettings({ type: "SET_ANALYTICS", analytics: enabled });
        }}
        label={t("settings.appearance.analytics")}
        description={t("settings.appearance.analyticsDesc")}
      />

      <SettingsSwitch
        enabled={settings.whatsNewOnStartup}
        setEnabled={(enabled) =>
          dispatchSettings({ type: "SET_WHATS_NEW", whatsnew: enabled })
        }
        label={t("settings.appearance.whatsNew")}
        description={t("settings.appearance.whatsNewDesc")}
      />

      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>{t("settings.appearance.theme")}</Label>
          <Description as="span" className="text-sm text-gray-500">
            {t("settings.appearance.themeDesc")}
          </Description>
        </span>
        <Select
          className={clsx(
            "block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
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
          <option value={ColorScheme.DARK}>{t("settings.appearance.themeDark")}</option>
          <option value={ColorScheme.LIGHT}>{t("settings.appearance.themeLight")}</option>
          <option value={ColorScheme.SYSTEM}>{t("settings.appearance.themeSystem")}</option>
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
        label={t("settings.appearance.publishLeaderboard")}
        description={t("settings.appearance.publishLeaderboardDesc")}
      />

      <SettingsSwitch
        enabled={settings.blinker}
        setEnabled={(enabled: boolean) =>
          dispatchSettings({ type: "SET_BLINKER", blinker: enabled })
        }
        label={t("settings.appearance.blinker")}
        description={t("settings.appearance.blinkerDesc")}
      />

      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>{t("settings.appearance.appLanguage")}</Label>
          <Description as="span" className="text-sm text-gray-500">
            {t("settings.appearance.appLanguageDesc")}
          </Description>
        </span>
        <Select
          className={clsx(
            "block w-44 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
            "*:text-black",
            settings.autoDetectAppLanguage && "opacity-50 cursor-not-allowed",
          )}
          value={settings.appLanguage}
          disabled={settings.autoDetectAppLanguage}
          onChange={(e) => {
            dispatchSettings({
              type: "SET_APP_LANGUAGE",
              appLanguage: e.target.value as Languages,
            });
          }}
        >
          {LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </Select>
      </Field>

      <SettingsSwitch
        enabled={settings.autoDetectAppLanguage}
        setEnabled={(enabled) => {
          dispatchSettings({ type: "SET_AUTO_DETECT_APP_LANGUAGE", enabled });
          if (enabled) {
            detectAppLanguage().then((detected) => {
              dispatchSettings({ type: "SET_APP_LANGUAGE", appLanguage: detected });
            });
          }
        }}
        label={t("settings.appearance.autoDetect")}
        description={t("settings.appearance.autoDetectDesc")}
      />
    </form>
  );
}

function KeyboardSettingsPanel() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  const { t } = useTranslation();

  const prevKeyboard = useRef(settings.keyboardName);
  useEffect(() => {
    if (prevKeyboard.current !== settings.keyboardName) {
      const langEntry = LANGUAGES.find((l) => l.value === settings.language);
      if (langEntry?.preferredKeyboards.includes(settings.keyboardName)) {
        dispatchSettings({
          type: "CLEAR_KEYBOARD_SUGGESTION_DISMISSAL",
          language: settings.language,
        });
      }
      prevKeyboard.current = settings.keyboardName;
    }
  }, [settings.keyboardName, settings.language, dispatchSettings]);

  const langEntry = LANGUAGES.find((l) => l.value === settings.language);
  const showSuggestion =
    langEntry !== undefined &&
    langEntry.preferredKeyboards.length > 0 &&
    !langEntry.preferredKeyboards.includes(settings.keyboardName) &&
    !settings.dismissedKeyboardSuggestions.includes(settings.language);

  const primaryKeyboard = langEntry?.preferredKeyboards[0];
  const primaryKeyboardName = primaryKeyboard
    ? (keyboards.find((k) => k.layout === primaryKeyboard)?.name ??
       primaryKeyboard)
    : "";

  return (
    <form className="flex flex-col gap-6">
      <KeyboardSelect />

      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>{t("settings.keyboard.practiceLanguage")}</Label>
          <Description as="span" className="text-sm text-gray-500">
            {t("settings.keyboard.practiceLanguageDesc")}
          </Description>
        </span>
        <Select
          className={clsx(
            "block w-44 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
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
          {LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </Select>
      </Field>

      {showSuggestion && primaryKeyboard && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-sky-400/[0.08] border border-sky-400/20 text-sm">
          <span className="text-slate-700 dark:text-slate-300">
            {langEntry?.label} types best with the{" "}
            <span className="font-semibold">{primaryKeyboardName}</span>{" "}
            keyboard.
          </span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                dispatchSettings({
                  type: "CHANGE_KEYBOARD",
                  keyboardName: primaryKeyboard,
                });
                dispatchSettings({
                  type: "DISMISS_KEYBOARD_SUGGESTION",
                  language: settings.language,
                });
              }}
              className="text-sky-400 font-semibold hover:text-sky-300 transition-colors"
            >
              Switch
            </button>
            <button
              type="button"
              onClick={() =>
                dispatchSettings({
                  type: "DISMISS_KEYBOARD_SUGGESTION",
                  language: settings.language,
                })
              }
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function PracticeSettingsPanel() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-6">
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

        <SettingsSwitch
          enabled={settings.punctuation}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_PUNCTUATION", punctuation: enabled })
          }
          label="Punctuation"
          description="Include punctuation in the words to type."
        />
        <SettingsSwitch
          enabled={settings.numbers}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_NUMBERS", numbers: enabled })
          }
          label="Numbers"
          description="Include numbers in the words to type."
        />
        <SettingsSwitch
          enabled={settings.capital}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_CAPITAL", capital: enabled })
          }
          label="Capital Letters"
          description="Include capital letters in the words to type."
        />
      </form>

      <CodeSettings />
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div className="flex flex-col gap-6">
      <NotificationSettings />
      <hr className="border-white/10" />
      <CalendarSettings />
      <hr className="border-white/10" />
      <StartupSettings />
    </div>
  );
}

function AccountPanel() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Manage your account settings and subscription.
      </p>
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="flex flex-col gap-6">
      <DebugSettings />
    </div>
  );
}

// ── Main Settings component ───────────────────────────────────────────────────

const Settings = () => {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategoryId>("appearance");
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        icon={faGear}
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        iconBg="bg-slate-400/10"
        iconColor="text-slate-400 dark:text-slate-300"
      />

      <div className="px-6 pb-8 flex gap-6 max-w-5xl">
        {/* Left category nav */}
        <nav className="w-44 flex-shrink-0 flex flex-col gap-0.5 pt-1">
          {SETTINGS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                activeCategory === cat
                  ? "bg-sky-400/10 text-sky-400"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-700 dark:hover:text-slate-200",
              )}
            >
              {t(`settings.categories.${cat}`)}
            </button>
          ))}
        </nav>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          {activeCategory === "appearance" && <AppearanceSettings />}
          {activeCategory === "keyboard" && <KeyboardSettingsPanel />}
          {activeCategory === "practice" && <PracticeSettingsPanel />}
          {activeCategory === "notifications" && <NotificationsPanel />}
          {activeCategory === "account" && <AccountPanel />}
          {activeCategory === "about" && <AboutPanel />}
        </div>
      </div>
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
          enabled ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700",
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-transparent",
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
