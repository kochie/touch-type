import { KeyboardLayoutNames } from "@/keyboards";
import { useSettings, useSettingsDispatch } from "@/lib/settings_hook";
import {
  Description,
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { useLayoutEffect, useState } from "react";

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
  {
    name: "MAC QWERTY (Māori)",
    layout: KeyboardLayoutNames.MACOS_NZ_QWERTY,
    country: "🇳🇿",
  },
];

export default function KeyboardSelect() {
  //   const [selected, setSelected] = useState(people[3])
  const [selectedKeyboard, setSelectedKeyboard] = useState(keyboards[0]);

  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();

  useLayoutEffect(() => {
    const foundKeyboard = keyboards.find(
      (keyboard) => keyboard.layout === settings.keyboardName,
    );
    if (foundKeyboard) {
      setSelectedKeyboard(foundKeyboard);
    }
  }, []);

  const handleChange = (value: KeyboardLayoutNames) => {
    const keyboard = keyboards.find((keyboard) => keyboard.layout === value);
    if (!keyboard) return 
    setSelectedKeyboard(keyboard);
    dispatchSettings({
      type: "CHANGE_KEYBOARD",
      keyboardName: value,
    });
  };

  return (
    <Field>
      <Label className="block text-sm font-medium leading-6">
        Keyboard Layout
      </Label>
      <Description as="span" className="text-sm text-gray-500">
        Select the keyboard layout you are using.
      </Description>
      <Listbox value={selectedKeyboard.name} onChange={handleChange}>
        <ListboxButton
          className={clsx(
            "relative block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
          )}
        >
          <span className="flex items-center">
            <span className="flex-shrink text-lg">
              {selectedKeyboard.country}
            </span>
            <span className="ml-3 block truncate">{selectedKeyboard.name}</span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom"
          transition
          className={clsx(
            // "m-y-10",
            "w-[var(--button-width)] rounded-xl border border-white/5 bg-black p-1 focus:outline-none",
            "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0",
            // "backdrop-blur-md",
          )}
        >
          {keyboards.map((keyboard) => (
            <ListboxOption
              key={keyboard.name}
              className="group flex cursor-pointer items-center gap-2 rounded-lg py-1.5 px-3 data-[focus]:bg-white/10"
              value={keyboard.layout}
            >
              {({ selected, active }) => (
                <>
                  <div className="flex items-center">
                    <span className="flex-shrink text-lg">
                      {keyboard.country}
                    </span>
                    {/* <img src={keyboard.avatar} alt="" className="h-5 w-5 flex-shrink-0 rounded-full" /> */}
                    <span
                      className={clsx(
                        selected ? "font-semibold" : "font-normal",
                        "ml-3 text-sm/6 text-white",
                      )}
                    >
                      {keyboard.name}
                    </span>
                  </div>

                  {selected ? (
                    <span
                      className={clsx(
                        // active ? "text-white" : "text-indigo-600",
                        "absolute inset-y-0 right-0 flex items-center pr-4",
                      )}
                    >
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </Field>
  );
}
