import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";

import Text from "./whatsnew.mdx";
import Button from "../Button";
import Toggle from "./switch";
import { useSettings, useSettingsDispatch } from "@/lib/settings_hook";

export default function WhatsNew({ onClose }) {
  const settings = useSettings();
  const settingsDispatch = useSettingsDispatch();

  const setEnabled = (checked: boolean) => {
    settingsDispatch({ type: "SET_WHATS_NEW", whatsnew: checked });
  };

  // useEffect(() => {
  //   localStorage.setItem("settings", JSON.stringify(settings));
  // }, [settings])

  return (
    <div className="p-4">
      <div>
        <div className="mt-3 sm:mt-5">
          <Dialog.Title
            as="h3"
            className="text-2xl font-semibold leading-6 text-gray-900"
          >
            What&apos;s New
          </Dialog.Title>
          <div className="mt-2">
            <Text />
          </div>
        </div>
      </div>
      <div>
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
