"use client";

import User from "@/components/User";
import {
  faChartColumn,
  faGear,
  faKeyboard,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { faChartRadar } from "@fortawesome/pro-regular-svg-icons";
import { faSparkles } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { Suspense, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { defaultSettings, useSettings } from "@/lib/settings_hook";
import { keyboards } from "../KeyboardSelect";
import { languages } from "../settings/settings";

interface MenuProps {
  handleWhatsNew?: () => void;
  handleSignIn?: () => void;
  handleAccount?: () => void;
}

export default function Menu({
  handleWhatsNew,
  handleSignIn,
  handleAccount,
}: MenuProps) {
  const pathname = usePathname();
  const settings = useSettings();

  // This is being done because of hydration errors in the settings hook. 
  // Because using the settings hook uses local storage any direct rendering 
  // of the settings hook will cause a hydration error.
  const [hydratedSettings, setHydratedSettings] = useState(defaultSettings)
  useLayoutEffect(() => {
    setHydratedSettings(prev => ({...prev, ...settings}))
  }, [settings]);

  return (
    <div className="flex justify-between mt-8 mx-8">
      <div className="flex gap-4">
        <div className="hover:animate-pulse" title="Stats">
          <Link href={"/stats"}>
            <FontAwesomeIcon
              icon={faChartColumn}
              className={clsx(
                pathname === "/stats" ? "text-yellow-500" : "",
                "cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out",
              )}
              size="lg"
            />
          </Link>
        </div>
        <div className="hover:animate-pulse" title="Heatmap">
          <Link href={"/heatmap"}>
            <FontAwesomeIcon
              icon={faChartRadar}
              className={clsx(
                pathname === "/heatmap" ? "text-yellow-500" : "",
                "cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out",
              )}
              size="lg"
            />
          </Link>
        </div>
        <div className="hover:animate-pulse">
          <Link href={"/"}>
            <FontAwesomeIcon
              icon={faKeyboard}
              className={clsx(
                pathname === "/" ? "text-yellow-500" : "",
                "cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out",
              )}
              size="lg"
            />
          </Link>
        </div>
      </div>

      {pathname === "/" ? (
        <div className="flex gap-4 text-sm font-normal text-gray-400">
          <div className="after:content-['•'] after:absolute after:right-0 after:pl-2 last:after:content-['']">
            <p className="">
              Level <span>{hydratedSettings.levelName}</span>
            </p>
          </div>
          <div>
            <p className="">
              {
                keyboards.find(
                  (keyboard) => keyboard.layout === hydratedSettings.keyboardName,
                )?.name
              }
            </p>
          </div>
          <div>
            <p className="">
              {
                languages.find((lang) => lang.value === hydratedSettings.language)
                  ?.label
              }
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-4">
        <Suspense
          fallback={
            <FontAwesomeIcon
              icon={faSpinner}
              className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
              size="lg"
              spin
            />
          }
        >
          <User signIn={handleSignIn} account={handleAccount} />
        </Suspense>
        <button onClick={handleWhatsNew} title="What's New">
          <FontAwesomeIcon
            icon={faSparkles}
            className="cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out"
            size="lg"
          />
        </button>
        <div className="hover:animate-pulse" title="Settings">
          <Link href={"/settings"}>
            <FontAwesomeIcon
              icon={faGear}
              className={clsx(
                pathname === "/settings" ? "text-yellow-500" : "",
                "cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out",
              )}
              size="lg"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
