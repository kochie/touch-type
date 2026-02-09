"use client";

import { HeatmapCanvas, type HeatmapMode } from "@/components/HeatmapCanvas";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import { useState } from "react";
import {
  Field,
  Label,
  Description,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

const HEATMAP_MODE_OPTIONS: { value: HeatmapMode; label: string }[] = [
  { value: "errors", label: "Highest error keys" },
  { value: "accuracy", label: "Highest accuracy keys" },
];

export default function HeatmapPage() {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);
  const [mode, setMode] = useState<HeatmapMode>("errors");

  return (
    <div className="">
      <div className="max-w-4xl mx-auto mt-5 space-y-4">

        <div className="flex flex-wrap items-center gap-4 w-full">
          <div className="grow">
            <KeyboardSelect
              selectedKeyboardName={keyboard}
              setSelectedKeyboard={setKeyboard}
              label="Keyboard Layout"
              description="Select a keyboard layout to display the heatmap."
            />
          </div>
          <div className="min-w-[200px]">
            <Field>
              <Label className="block text-sm font-medium leading-6">Mode</Label>
              <Description as="span" className="text-sm text-gray-500">
                Select the mode to display the heatmap.
              </Description>
              <Listbox value={mode} onChange={setMode}>
                <ListboxButton
                  className={clsx(
                    "relative block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6 text-white",
                    "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
                  )}
                >
                  <span className="block truncate">
                    {HEATMAP_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className={clsx(
                    "w-[var(--button-width)] rounded-xl border border-white/5 bg-black p-1 focus:outline-none",
                    "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0"
                  )}
                >
                  {HEATMAP_MODE_OPTIONS.map((option) => (
                    <ListboxOption
                      key={option.value}
                      className="group relative flex w-full cursor-pointer items-center rounded-lg py-1.5 px-3 data-[focus]:bg-white/10"
                      value={option.value}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={clsx(
                              selected ? "font-semibold" : "font-normal",
                              "block truncate text-sm/6 text-white"
                            )}
                          >
                            {option.label}
                          </span>
                          {selected && (
                            <span className="absolute inset-y-0 right-0 flex items-center justify-end pr-3">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Listbox>
            </Field>
          </div>

        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          The heatmap shows how you type across the keyboard. Each key is colored by{" "}
          {mode === "errors"
            ? "how many times you hit it incorrectly — darker red means more errors, so you can see which keys need practice."
            : "your accuracy on that key — green means high accuracy, red means more mistakes. Keys with too little data stay neutral."}
        </p>

      </div>

      <div className="">
        <HeatmapCanvas keyboardName={keyboard} mode={mode} />
      </div>
    </div>
  );
}
