"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Languages,
  Levels,
  useSettings,
} from "@/lib/settings_hook";
import { useWords } from "@/lib/word-provider";
import { usePvP, type BestOf, type ChallengeSettings } from "@/lib/pvp-provider";
import { keyboards } from "../KeyboardSelect";
import { levels } from "../settings/settings";
import { LANGUAGES as languages } from "@/lib/languages";
import { KeyboardLayoutNames } from "@/keyboards";
import {
  Description,
  Field,
  Label,
  Select,
  Switch,
} from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faSpinner } from "@fortawesome/pro-duotone-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import { toast } from "sonner";

const WORD_COUNT = 15;

function generateWordSet(wordList: string[]): string[] {
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, WORD_COUNT);
}

interface ToggleProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Toggle({ label, enabled, onChange }: ToggleProps) {
  return (
    <Field as="div" className="flex items-center justify-between">
      <Label className="text-sm text-gray-700 dark:text-gray-300">{label}</Label>
      <Switch
        checked={enabled}
        onChange={onChange}
        className={clsx(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
          enabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition my-0.5",
            enabled ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </Switch>
    </Field>
  );
}

export default function NewChallengePrompt({ onDone, onClose }: { onDone?: () => void; onClose?: () => void }) {
  const router = useRouter();
  const settings = useSettings();
  const [wordList] = useWords();
  const { createMatch } = usePvP();
  const [creating, setCreating] = useState(false);

  // Local form state — defaults to the user's global settings but is editable
  // per-challenge without mutating the global settings.
  const [level, setLevel] = useState<Levels>(settings.levelName);
  const [keyboard, setKeyboard] = useState<KeyboardLayoutNames>(
    settings.keyboardName,
  );
  const [language, setLanguage] = useState<Languages>(settings.language);
  const [capital, setCapital] = useState(settings.capital);
  const [punctuation, setPunctuation] = useState(settings.punctuation);
  const [numbers, setNumbers] = useState(settings.numbers);
  const [bestOf, setBestOf] = useState<BestOf>(1);

  const handleStart = async () => {
    if (wordList.length === 0) {
      toast.error("Word list still loading — try again in a moment");
      return;
    }
    setCreating(true);
    const wordSets = Array.from({ length: bestOf }, () => generateWordSet(wordList));
    const challengeSettings: ChallengeSettings = {
      keyboard,
      level,
      language,
      capital,
      punctuation,
      numbers,
      best_of: bestOf,
      word_sets: wordSets,
    };
    const match = await createMatch(challengeSettings);
    setCreating(false);
    if (match) {
      onDone?.();
      router.push(`/pvp/challenge?id=${match.id}`);
    }
  };

  const selectClass = clsx(
    "block w-full appearance-none rounded-lg bg-white/5 dark:bg-gray-900/50 py-1.5 px-3 text-sm/6",
    "text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700",
    "focus:outline-none focus:ring-2 focus:ring-blue-500",
    // Make option text legible on Windows where the popup uses system colors
    "*:text-black",
  );

  return (
    <div className="p-6 space-y-5 w-full max-w-md">
      <div className="relative text-center">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-0 top-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
          </button>
        )}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Create a Game
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pick the settings, share the link, and race when you're ready. Both
          sides play blind — neither sees the other's score until both finish.
        </p>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Challenge Settings
        </p>

        <Field as="div" className="flex items-center justify-between gap-3">
          <Label className="text-sm text-gray-700 dark:text-gray-300">Level</Label>
          <Select
            data-testid="pvp-setting-level"
            value={level}
            onChange={(e) => setLevel(e.target.value as Levels)}
            className={clsx(selectClass, "w-32")}
          >
            {levels.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field as="div" className="flex items-center justify-between gap-3">
          <Label className="text-sm text-gray-700 dark:text-gray-300">Keyboard</Label>
          <Select
            data-testid="pvp-setting-keyboard"
            value={keyboard}
            onChange={(e) => setKeyboard(e.target.value as KeyboardLayoutNames)}
            className={clsx(selectClass, "w-44")}
          >
            {keyboards.map((kb) => (
              <option key={kb.layout} value={kb.layout}>
                {kb.country} {kb.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field as="div" className="flex items-center justify-between gap-3">
          <Label className="text-sm text-gray-700 dark:text-gray-300">Language</Label>
          <Select
            data-testid="pvp-setting-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Languages)}
            className={clsx(selectClass, "w-32")}
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field as="div" className="flex items-center justify-between gap-3">
          <Label className="text-sm text-gray-700 dark:text-gray-300">Format</Label>
          <Select
            data-testid="pvp-setting-best-of"
            value={String(bestOf)}
            onChange={(e) => setBestOf(Number(e.target.value) as BestOf)}
            className={clsx(selectClass, "w-32")}
          >
            <option value="1">Single race</option>
            <option value="3">Best of 3</option>
            <option value="5">Best of 5</option>
            <option value="7">Best of 7</option>
          </Select>
        </Field>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <Toggle label="Capitals" enabled={capital} onChange={setCapital} />
          <Toggle
            label="Punctuation"
            enabled={punctuation}
            onChange={setPunctuation}
          />
          <Toggle label="Numbers" enabled={numbers} onChange={setNumbers} />
        </div>
      </div>

      <button
        data-testid="pvp-create-game"
        onClick={handleStart}
        disabled={creating}
        className={clsx(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold",
          "bg-blue-500 hover:bg-blue-600 text-white transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <FontAwesomeIcon
          icon={creating ? faSpinner : faPlay}
          className={clsx("w-5 h-5", creating && "animate-spin")}
        />
        {creating ? "Creating…" : "Create Game"}
      </button>
    </div>
  );
}
