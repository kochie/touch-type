import { KeyboardLayoutNames } from "@/keyboards";
import {
  Description,
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

export const KEYBOARD_OPTIONS = [
  { name: "MAC COLEMAK", layout: KeyboardLayoutNames.MACOS_US_COLEMAK, country: "🇺🇸" },
  { name: "MAC QWERTY (American)", layout: KeyboardLayoutNames.MACOS_US_QWERTY, country: "🇺🇸" },
  { name: "MAC DVORAK", layout: KeyboardLayoutNames.MACOS_US_DVORAK, country: "🇺🇸" },
  { name: "MAC AZERTY", layout: KeyboardLayoutNames.MACOS_FR_AZERTY, country: "🇫🇷" },
  { name: "MAC QWERTZ", layout: KeyboardLayoutNames.MACOS_DE_QWERTZ, country: "🇩🇪" },
  { name: "MAC QWERTY (Spanish)", layout: KeyboardLayoutNames.MACOS_ES_QWERTY, country: "🇪🇸" },
  { name: "MAC QWERTY (Māori)", layout: KeyboardLayoutNames.MACOS_NZ_QWERTY, country: "🇳🇿" },
];

interface KeyboardSelectPropsSingle {
  multiple?: false;
  selectedKeyboardName: KeyboardLayoutNames;
  setSelectedKeyboard: (keyboard: KeyboardLayoutNames) => void;
  label: string;
  description: string;
}

interface KeyboardSelectPropsMultiple {
  multiple: true;
  selectedKeyboardNames: KeyboardLayoutNames[];
  setSelectedKeyboards: (keyboards: KeyboardLayoutNames[]) => void;
  label: string;
  description: string;
}

type KeyboardSelectProps = KeyboardSelectPropsSingle | KeyboardSelectPropsMultiple;

function isMultiple(props: KeyboardSelectProps): props is KeyboardSelectPropsMultiple {
  return props.multiple === true;
}

export default function KeyboardSelect(props: KeyboardSelectProps) {
  const { label, description } = props;

  if (isMultiple(props)) {
    const { selectedKeyboardNames, setSelectedKeyboards } = props;
    const toggleKeyboard = (layout: KeyboardLayoutNames) => {
      const isSelected = selectedKeyboardNames.includes(layout);
      if (isSelected && selectedKeyboardNames.length <= 1) return;
      setSelectedKeyboards(
        isSelected
          ? selectedKeyboardNames.filter((k) => k !== layout)
          : [...selectedKeyboardNames, layout]
      );
    };

    const buttonLabel =
      selectedKeyboardNames.length === 0
        ? "Select keyboards"
        : selectedKeyboardNames.length === 1
          ? KEYBOARD_OPTIONS.find((k) => k.layout === selectedKeyboardNames[0])?.name ?? "1 keyboard"
          : `${selectedKeyboardNames.length} keyboards`;

    return (
      <Field>
        <Label className="block text-sm font-medium leading-6">{label}</Label>
        <Description as="span" className="text-sm text-gray-500">
          {description}
        </Description>
        <Popover className="relative">
          <PopoverButton
            className={clsx(
              "relative flex w-full items-center rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
            )}
          >
            <span className="block truncate">{buttonLabel}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </PopoverButton>
          <PopoverPanel
            anchor="bottom"
            transition
            className={clsx(
              "z-10 w-[var(--button-width)] rounded-xl border border-white/5 bg-black p-1",
              "transition duration-100 ease-in data-[closed]:opacity-0"
            )}
          >
            {KEYBOARD_OPTIONS.map((keyboard) => {
              const selected = selectedKeyboardNames.includes(keyboard.layout);
              return (
                <button
                  key={keyboard.layout}
                  type="button"
                  onClick={() => toggleKeyboard(keyboard.layout)}
                  className={clsx(
                    "group flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 px-3 text-left text-sm/6 text-white",
                    "hover:bg-white/10 focus:bg-white/10 focus:outline-none",
                    selected && "font-semibold"
                  )}
                >
                  <span className="flex-shrink text-lg">{keyboard.country}</span>
                  <span className="ml-3 flex-1 truncate">{keyboard.name}</span>
                  {selected && (
                    <span className="flex-shrink-0">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </PopoverPanel>
        </Popover>
      </Field>
    );
  }

  const { selectedKeyboardName, setSelectedKeyboard } = props;
  const handleChange = (value: KeyboardLayoutNames) => {
    setSelectedKeyboard(value);
  };

  return (
    <Field>
      <Label className="block text-sm font-medium leading-6">{label}</Label>
      <Description as="span" className="text-sm text-gray-500">
        {description}
      </Description>
      <Listbox value={selectedKeyboardName} onChange={handleChange}>
        <ListboxButton
          className={clsx(
            "relative block w-full rounded-lg bg-white/5 py-1.5 pr-8 pl-3 text-left text-sm/6 text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25"
          )}
        >
          <span className="flex items-center">
            <span className="flex-shrink text-lg">
              {KEYBOARD_OPTIONS.find((k) => k.layout === selectedKeyboardName)?.country}
            </span>
            <span className="ml-3 block truncate">
              {KEYBOARD_OPTIONS.find((k) => k.layout === selectedKeyboardName)?.name}
            </span>
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
          {KEYBOARD_OPTIONS.map((keyboard) => (
            <ListboxOption
              key={keyboard.name}
              className="group flex cursor-pointer items-center gap-2 rounded-lg py-1.5 px-3 data-[focus]:bg-white/10"
              value={keyboard.layout}
            >
              {({ selected }) => (
                <>
                  <div className="flex items-center">
                    <span className="flex-shrink text-lg">{keyboard.country}</span>
                    <span
                      className={clsx(
                        selected ? "font-semibold" : "font-normal",
                        "ml-3 text-sm/6 text-white"
                      )}
                    >
                      {keyboard.name}
                    </span>
                  </div>
                  {selected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
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
  );
}
