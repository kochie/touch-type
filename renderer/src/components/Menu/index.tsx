"use client";

import User from "@/components/User";
import {
  faChartColumn,
  faGear,
  faKeyboard,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import {
  faChartRadar,
  faMicrochipAi,
} from "@fortawesome/pro-regular-svg-icons";
import { faFire, faSparkles, faSwords } from "@fortawesome/pro-duotone-svg-icons";
import { usePvP } from "@/lib/pvp-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { Suspense, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { defaultSettings, useSettings } from "@/lib/settings_hook";
import { keyboards } from "../KeyboardSelect";
import { languages } from "../settings/settings";
import { useMas } from "@/lib/mas_hook";
import { usePlan } from "@/lib/plan_hook";
import { useStreak } from "@/lib/streak_hook";


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
  const isMas = useMas()
  const plan = usePlan();
  const { currentStreak, isAtRisk, isLoading: streakLoading } = useStreak();
  const { pendingCount } = usePvP();

  
  // This is being done because of hydration errors in the settings hook.
  // Because using the settings hook uses local storage any direct rendering
  // of the settings hook will cause a hydration error.
  const [hydratedSettings, setHydratedSettings] = useState(defaultSettings);
  useLayoutEffect(() => {
    setHydratedSettings((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const premium = plan?.billing_plan === "premium"

  return (
    <div className="top-0 sticky w-full">
      <div className="flex justify-between pt-8 mx-8">
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
          <div className={clsx("hover:animate-pulse", isMas && !premium && "hidden")}>
            <Link href={"/assistant"}>
              <FontAwesomeIcon
                icon={faMicrochipAi}
                className={clsx(
                  pathname === "/assistant" ? "text-yellow-500" : "",
                  "cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out",
                )}
                size="lg"
              />
            </Link>
          </div>
          <div className="hover:animate-pulse relative" title="PvP Arena">
            <Link href={"/pvp"}>
              <FontAwesomeIcon
                icon={faSwords}
                className={clsx(
                  pathname?.startsWith("/pvp") ? "text-yellow-500" : "",
                  "cursor-pointer hover:text-yellow-300 transform duration-200 ease-in-out",
                )}
                size="lg"
              />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {pathname === "/" ? (
          <div className="flex gap-2 text-sm font-normal text-gray-400">
            <div className="">
              <p className="">
                Level <span>{hydratedSettings.levelName}</span>
              </p>
            </div>
            <div>•</div>
            <div>
              <p className="">
                {
                  keyboards.find(
                    (keyboard) =>
                      keyboard.layout === hydratedSettings.keyboardName,
                  )?.name
                }
              </p>
            </div>{" "}
            <div>•</div>
            <div>
              <p className="">
                {
                  languages.find(
                    (lang) => lang.value === hydratedSettings.language,
                  )?.label
                }
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex gap-4 items-center">
          {/* Streak Display */}
          {!streakLoading && (
            <Link 
              href="/streak" 
              className={clsx(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium transition-colors",
                currentStreak === 0
                  ? "text-gray-500"
                  : isAtRisk
                  ? "text-orange-400 animate-pulse"
                  : "text-orange-400 hover:text-orange-300"
              )}
              title={isAtRisk && currentStreak > 0 ? "Practice today to keep your streak!" : `${currentStreak} day streak`}
            >
              <FontAwesomeIcon icon={faFire} size="lg" />
              <span>{currentStreak}</span>
            </Link>
          )}
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
    </div>
  );
}
