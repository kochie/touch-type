import {
  Label,
  Field,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import { KEY_MAPS, type KeyMapId } from "@/lib/key-maps";

interface KeyMapSelectProps {
  value: KeyMapId;
  onChange: (id: KeyMapId) => void;
  /** Premium maps show a lock for everyone else. They can still be opened to see what they are. */
  isPremium: boolean;
}

export default function KeyMapSelect({ value, onChange, isPremium }: KeyMapSelectProps) {
  const current = KEY_MAPS.find((m) => m.id === value) ?? KEY_MAPS[0];

  return (
    <Field>
      <Label className="sr-only">Map</Label>
      <Listbox value={value} onChange={onChange}>
        <ListboxButton
          className={clsx(
            "relative flex h-9 w-full items-center rounded-lg bg-slate-200 dark:bg-white/5 pr-8 pl-3 text-left text-sm/6 text-slate-900 dark:text-white",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-slate-400/50 dark:data-[focus]:outline-white/25",
          )}
        >
          <span className="block truncate">{current.label}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom"
          transition
          className={clsx(
            // Above the sticky title bar (z-20) the picker lives in.
            "z-50 w-[var(--button-width)] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/5 dark:bg-black dark:shadow-none focus:outline-none",
            "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0",
          )}
        >
          {KEY_MAPS.map((map) => (
            <ListboxOption
              key={map.id}
              value={map.id}
              className="group relative flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pl-3 pr-9 data-[focus]:bg-slate-100 dark:data-[focus]:bg-white/10"
            >
              {({ selected }) => (
                <>
                  <span
                    className={clsx(
                      selected ? "font-semibold" : "font-normal",
                      "text-sm/6 text-slate-900 dark:text-white",
                    )}
                  >
                    {map.label}
                  </span>
                  {map.premium && !isPremium && (
                    <FontAwesomeIcon
                      icon={faLock}
                      className="h-3 w-3 text-violet-700 dark:text-violet-400"
                      aria-label="Premium"
                    />
                  )}
                  {selected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3">
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
