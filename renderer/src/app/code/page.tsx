"use client";

import { Suspense, useEffect } from "react";
import Tracker from "@/components/Tracker";
import {
  CodeLanguages,
  SnippetSource,
  useSettings,
  useSettingsDispatch,
} from "@/lib/settings_hook";
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

const CODE_MODE_HEIGHT = 1100;
const DEFAULT_HEIGHT = 900;

function CodePageInner() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();

  useEffect(() => {
    let resized = false;
    const timer = setTimeout(() => {
      window.electronAPI?.setWindowHeight?.(CODE_MODE_HEIGHT);
      resized = true;
    }, 100);
    return () => {
      clearTimeout(timer);
      if (resized) window.electronAPI?.setWindowHeight?.(DEFAULT_HEIGHT);
    };
  }, []);

  const rightPanel = (
    <div className="flex flex-col gap-1.5">
      {CODE_LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          onClick={() => dispatch({ type: "SET_CODE_LANG", codeLang: lang.value })}
          className={clsx(
            "w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors duration-150",
            settings.codeLang === lang.value
              ? "bg-sky-400/10 text-sky-400 border border-sky-400/30"
              : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-200 dark:hover:bg-white/[0.07] hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          {lang.label}
        </button>
      ))}

      <div className="border-t border-white/[0.07] my-1" />

      {([SnippetSource.BUNDLED, SnippetSource.GENERATED] as const).map((src) => (
        <button
          key={src}
          onClick={() => dispatch({ type: "SET_CODE_SNIPPET_SOURCE", source: src })}
          className={clsx(
            "w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors duration-150 capitalize",
            settings.codeSnippetSource === src
              ? "bg-slate-900/10 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10"
              : "text-slate-400 dark:text-slate-500 border border-transparent hover:text-slate-600 dark:hover:text-slate-300"
          )}
        >
          {src}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <Tracker mode="code" rightPanel={rightPanel} />
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
