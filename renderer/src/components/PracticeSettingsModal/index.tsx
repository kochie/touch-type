"use client";

import { useSettings, useSettingsDispatch, Levels, Languages } from "@/lib/settings_hook";
import { KeyboardLayoutNames } from "@/keyboards";
import { keyboards } from "@/components/KeyboardSelect";
import { LANGUAGES } from "@/lib/languages";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useLayoutEffect, useState } from "react";
import { defaultSettings } from "@/lib/settings_hook";

const LEVELS: { value: Levels; label: string }[] = [
  { value: Levels.LEVEL_1, label: "Level 1" },
  { value: Levels.LEVEL_2, label: "Level 2" },
  { value: Levels.LEVEL_3, label: "Level 3" },
  { value: Levels.LEVEL_4, label: "Level 4" },
  { value: Levels.LEVEL_5, label: "Level 5" },
  { value: Levels.LEVEL_6, label: "Level 6" },
];

const activeBtn = "bg-sky-50 text-sky-600 border border-sky-300 dark:bg-sky-400/10 dark:text-sky-400 dark:border-sky-400/30";
const inactiveBtn = "bg-slate-100 text-slate-600 border border-transparent hover:text-slate-900 hover:bg-slate-200 dark:bg-white/[0.04] dark:text-slate-400 dark:border-transparent dark:hover:text-slate-200 dark:hover:bg-white/[0.07]";

interface PracticeSettingsModalProps {
  onClose: () => void;
}

export default function PracticeSettingsModal({ onClose }: PracticeSettingsModalProps) {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();

  const [hydrated, setHydrated] = useState(defaultSettings);
  useLayoutEffect(() => {
    setHydrated((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  return (
    <div className="w-[720px] bg-white dark:bg-[#13161c] rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.06]">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Practice Settings</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/[0.06] transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        {/* Level + Language side by side */}
        <div className="flex gap-6">
          {/* Level */}
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 block">
              Level
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => dispatch({ type: "CHANGE_LEVEL", levelName: level.value })}
                  className={clsx(
                    "py-2 rounded-lg text-xs font-semibold transition-colors duration-150",
                    hydrated.levelName === level.value ? activeBtn : inactiveBtn
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 block">
              Language
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => dispatch({ type: "CHANGE_LANGUAGE", language: lang.value })}
                  className={clsx(
                    "px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 text-left",
                    hydrated.language === lang.value ? activeBtn : inactiveBtn
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Filters */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 block">
            Content
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Punctuation", key: "punctuation", action: "SET_PUNCTUATION" as const },
              { label: "Numbers", key: "numbers", action: "SET_NUMBERS" as const },
              { label: "Capital Letters", key: "capital", action: "SET_CAPITAL" as const },
            ].map(({ label, key, action }) => {
              const active = hydrated[key as keyof typeof hydrated] as boolean;
              return (
                <button
                  key={key}
                  onClick={() => dispatch({ type: action, [key]: !active } as Parameters<typeof dispatch>[0])}
                  className={clsx(
                    "py-2 rounded-lg text-xs font-semibold transition-colors duration-150",
                    active ? activeBtn : inactiveBtn
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Keyboard Layout — full width, 4 columns */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 block">
            Keyboard Layout
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {keyboards.map((kb) => (
              <button
                key={kb.layout}
                onClick={() => dispatch({ type: "CHANGE_KEYBOARD", keyboardName: kb.layout as KeyboardLayoutNames })}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 text-left",
                  hydrated.keyboardName === kb.layout ? activeBtn : inactiveBtn
                )}
              >
                <span>{kb.country}</span>
                <span>{kb.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-5">
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-300 text-sm font-semibold hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 dark:hover:bg-sky-500/20 transition-colors duration-150"
        >
          Done
        </button>
      </div>
    </div>
  );
}
