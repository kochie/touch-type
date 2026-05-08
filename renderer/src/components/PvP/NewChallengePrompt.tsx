"use client";

import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/settings_hook";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/pro-duotone-svg-icons";
import clsx from "clsx";

export default function NewChallengePrompt() {
  const router = useRouter();
  const settings = useSettings();

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ready to Race?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Type a 15-word set with your current settings. Your time becomes the
          score-to-beat for whoever you share the link with.
        </p>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
          Settings
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            Level {settings.levelName}
          </span>
          <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {settings.keyboardName}
          </span>
          <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {settings.language.toUpperCase()}
          </span>
          {settings.capital && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
              Capitals
            </span>
          )}
          {settings.punctuation && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
              Punctuation
            </span>
          )}
          {settings.numbers && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-300">
              Numbers
            </span>
          )}
        </div>
      </div>

      <button
        data-testid="pvp-start-race"
        onClick={() => router.push("/pvp/race?new=1")}
        className={clsx(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold",
          "bg-blue-500 hover:bg-blue-600 text-white transition-colors",
        )}
      >
        <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
        Start Race
      </button>
    </div>
  );
}
