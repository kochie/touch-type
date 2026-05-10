"use client";

import { Suspense } from "react";
import Tracker from "@/components/Tracker";
import {
  CodeLanguages,
  SnippetSource,
  useSettings,
  useSettingsDispatch,
} from "@/lib/settings_hook";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode } from "@fortawesome/pro-regular-svg-icons";
import clsx from "clsx";

const CODE_LANGUAGES: { value: CodeLanguages; label: string }[] = [
  { value: CodeLanguages.C, label: "C" },
  { value: CodeLanguages.GO, label: "Go" },
  { value: CodeLanguages.PYTHON, label: "Python" },
  { value: CodeLanguages.JAVASCRIPT, label: "JavaScript" },
  { value: CodeLanguages.JAVA, label: "Java" },
  { value: CodeLanguages.KOTLIN, label: "Kotlin" },
  { value: CodeLanguages.SWIFT, label: "Swift" },
];

function CodePageInner() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0 bg-sky-400/10">
            <FontAwesomeIcon icon={faCode} className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Code
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Practice real code snippets with proper indentation and syntax
            </p>
          </div>
        </div>

        {/* Language selector bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {CODE_LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() =>
                dispatch({ type: "SET_CODE_LANG", codeLang: lang.value })
              }
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150",
                settings.codeLang === lang.value
                  ? "bg-sky-400/10 text-sky-400 border border-sky-400/30"
                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-200 dark:hover:bg-white/[0.07] hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {lang.label}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            {([SnippetSource.BUNDLED, SnippetSource.GENERATED] as const).map(
              (src) => (
                <button
                  key={src}
                  onClick={() =>
                    dispatch({ type: "SET_CODE_SNIPPET_SOURCE", source: src })
                  }
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 capitalize",
                    settings.codeSnippetSource === src
                      ? "bg-slate-900/10 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  {src}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Tracker in code mode */}
      <Tracker mode="code" />
    </div>
  );
}

export default function CodePage() {
  return (
    <Suspense>
      <CodePageInner />
    </Suspense>
  );
}
