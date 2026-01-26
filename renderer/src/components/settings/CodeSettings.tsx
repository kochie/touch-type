"use client";

import {
  CodeLanguages,
  SnippetSource,
  useSettings,
  useSettingsDispatch,
} from "@/lib/settings_hook";
import { Description, Field, Label, Select, Switch } from "@headlessui/react";
import { platform } from "os";
import clsx from "clsx";
import { useState } from "react";

const codeLanguages = [
  { value: CodeLanguages.C, label: "C" },
  { value: CodeLanguages.PYTHON, label: "Python" },
  { value: CodeLanguages.JAVASCRIPT, label: "JavaScript" },
];

const snippetSources = [
  { value: SnippetSource.BUNDLED, label: "Bundled Snippets" },
  { value: SnippetSource.GENERATED, label: "Generated Code" },
  { value: SnippetSource.FILE, label: "Custom File" },
];

const tabWidthOptions = [
  { value: 2, label: "2 spaces" },
  { value: 4, label: "4 spaces" },
];

export function CodeSettings() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  const [isSelectingFile, setIsSelectingFile] = useState(false);

  const handleSelectFile = async () => {
    setIsSelectingFile(true);
    try {
      // @ts-expect-error - electronAPI is injected by preload
      const result = await window.electronAPI.showOpenDialog();
      if (!result.canceled && result.filePaths.length > 0) {
        dispatchSettings({
          type: "SET_CUSTOM_CODE_PATH",
          path: result.filePaths[0],
        });
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    } finally {
      setIsSelectingFile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Code Mode</h3>
        <span className="bg-blue-600 text-xs px-2 py-0.5 rounded-full">Beta</span>
      </div>

      {/* Code Mode Toggle */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label
            as="span"
            className={clsx(
              "text-sm font-medium leading-6",
              platform() === "darwin" ? "text-white" : "",
            )}
          >
            Enable Code Mode
          </Label>
          <Description as="span" className="text-sm text-gray-500">
            Practice typing real code snippets with proper indentation and syntax.
          </Description>
        </span>
        <Switch
          checked={settings.codeMode}
          onChange={(enabled) =>
            dispatchSettings({ type: "SET_CODE_MODE", enabled })
          }
          className={clsx(
            settings.codeMode ? "bg-indigo-600" : "bg-gray-200",
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
          )}
        >
          <span
            aria-hidden="true"
            className={clsx(
              settings.codeMode ? "translate-x-5" : "translate-x-0",
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            )}
          />
        </Switch>
      </Field>

      {/* Code mode specific settings - only show when code mode is enabled */}
      {settings.codeMode && (
        <>
          {/* Programming Language */}
          <Field as="div" className="flex items-center justify-between">
            <span className="flex flex-grow flex-col">
              <Label>Programming Language</Label>
              <Description as="span" className="text-sm text-gray-500">
                Select the programming language for code snippets.
              </Description>
            </span>
            <Select
              className={clsx(
                "block w-32 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
                "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
                "*:text-black",
              )}
              value={settings.codeLang}
              onChange={(e) =>
                dispatchSettings({
                  type: "SET_CODE_LANG",
                  codeLang: e.target.value as CodeLanguages,
                })
              }
            >
              {codeLanguages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Snippet Source */}
          <Field as="div" className="flex items-center justify-between">
            <span className="flex flex-grow flex-col">
              <Label>Snippet Source</Label>
              <Description as="span" className="text-sm text-gray-500">
                Choose where to get code snippets from.
              </Description>
            </span>
            <Select
              className={clsx(
                "block w-40 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
                "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
                "*:text-black",
              )}
              value={settings.codeSnippetSource}
              onChange={(e) =>
                dispatchSettings({
                  type: "SET_CODE_SNIPPET_SOURCE",
                  source: e.target.value as SnippetSource,
                })
              }
            >
              {snippetSources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Custom File Path - only show when source is FILE */}
          {settings.codeSnippetSource === SnippetSource.FILE && (
            <Field as="div" className="flex items-center justify-between">
              <span className="flex flex-grow flex-col">
                <Label>Custom Code File</Label>
                <Description as="span" className="text-sm text-gray-500">
                  {settings.customCodePath
                    ? `Selected: ${settings.customCodePath.split("/").pop()}`
                    : "Select a code file to practice typing."}
                </Description>
              </span>
              <button
                type="button"
                onClick={handleSelectFile}
                disabled={isSelectingFile}
                className={clsx(
                  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white",
                  "hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {isSelectingFile ? "Selecting..." : "Browse..."}
              </button>
            </Field>
          )}

          {/* Tab Width */}
          <Field as="div" className="flex items-center justify-between">
            <span className="flex flex-grow flex-col">
              <Label>Tab Width</Label>
              <Description as="span" className="text-sm text-gray-500">
                Number of spaces for indentation.
              </Description>
            </span>
            <Select
              className={clsx(
                "block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
                "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
                "*:text-black",
              )}
              value={settings.tabWidth}
              onChange={(e) =>
                dispatchSettings({
                  type: "SET_TAB_WIDTH",
                  width: parseInt(e.target.value, 10),
                })
              }
            >
              {tabWidthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Info box about code mode usage */}
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h4 className="text-sm font-medium mb-2">Tips for Code Mode</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Press <kbd className="bg-gray-700 px-1 rounded">Tab</kbd> for indentation (inserts spaces)</li>
              <li>• Press <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> for new lines</li>
              <li>• The <span className="text-yellow-500">·</span> symbol shows where to type a space</li>
              <li>• The <span className="text-gray-500">↵</span> symbol shows where to press Enter</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
