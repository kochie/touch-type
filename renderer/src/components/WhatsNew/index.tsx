"use client";

import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

import V3 from "./versions/v3.0.0.mdx";
import V2 from "./versions/v2.0.0.mdx";
import Button from "../Button";
import Toggle from "./switch";
import { useSettings, useSettingsDispatch } from "@/lib/settings_hook";

const VERSIONS: { label: string; Content: React.ComponentType }[] = [
  { label: "v3.0.0", Content: V3 },
  { label: "v2.0.0", Content: V2 },
];

export default function WhatsNew({ onClose }) {
  const settings = useSettings();
  const settingsDispatch = useSettingsDispatch();
  const [page, setPage] = useState(0);

  const { label, Content } = VERSIONS[page];

  const setEnabled = (checked: boolean) => {
    settingsDispatch({ type: "SET_WHATS_NEW", whatsnew: checked });
  };

  return (
    <div className="p-4 w-[520px]">
      <div className="flex items-start justify-between">
        <Dialog.Title
          as="h3"
          className="text-2xl font-semibold leading-6 text-gray-900"
        >
          What&apos;s New
        </Dialog.Title>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Newer version"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-mono text-gray-500 min-w-[52px] text-center">
            {label}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page === VERSIONS.length - 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Older version"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 prose prose-sm max-w-none">
        <Content />
      </div>

      <div className="mt-4">
        <Toggle
          label="Show What's New on Startup"
          description=""
          enabled={settings.whatsNewOnStartup}
          setEnabled={setEnabled}
        />
      </div>
      <div className="mt-5 sm:mt-6">
        <Button onClick={onClose}>Nice!</Button>
      </div>
    </div>
  );
}
