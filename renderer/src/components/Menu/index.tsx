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
  faCode,
} from "@fortawesome/pro-regular-svg-icons";
import { faDumbbell, faFire, faSparkles, faSwords } from "@fortawesome/pro-duotone-svg-icons";
import { faXmark } from "@fortawesome/pro-regular-svg-icons";
import { usePvP } from "@/lib/pvp-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { defaultSettings, useSettings } from "@/lib/settings_hook";
import { keyboards } from "../KeyboardSelect";
import { LANGUAGES } from "@/lib/languages";
import { useMas } from "@/lib/mas_hook";
import { usePlan } from "@/lib/plan_hook";
import { useStreak } from "@/lib/streak_hook";
import { useWords } from "@/lib/word-provider";

interface MenuProps {
  handleWhatsNew?: () => void;
  handleSignIn?: () => void;
  handleAccount?: () => void;
  handlePracticeSettings?: () => void;
}

interface NavItemProps {
  href: string;
  icon: typeof faKeyboard;
  label: string;
  isActive: boolean;
  badge?: number;
  hidden?: boolean;
}

function NavItem({ href, icon, label, isActive, badge, hidden }: NavItemProps) {
  if (hidden) return null;
  return (
    <Link href={href}>
      <div
        title={label}
        className={clsx(
          "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors duration-150",
          isActive
            ? "text-sky-400 bg-sky-400/10"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5"
        )}
      >
        <FontAwesomeIcon icon={icon} className="w-4 h-4" />
        <span className="text-[9px] font-semibold tracking-widest uppercase select-none">
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Menu({
  handleWhatsNew,
  handleSignIn,
  handleAccount,
  handlePracticeSettings,
}: MenuProps) {
  const pathname = usePathname();
  const settings = useSettings();
  const isMas = useMas();
  const plan = usePlan();
  const { currentStreak, isAtRisk, isLoading: streakLoading } = useStreak();
  const { myActiveGames } = usePvP();
  const [, setWords, drillInfo] = useWords();

  const [hydratedSettings, setHydratedSettings] = useState(defaultSettings);
  useLayoutEffect(() => {
    setHydratedSettings((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const premium = plan?.billing_plan === "premium";

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={clsx(
        "top-0 sticky relative w-full z-50 transition-all duration-300 ease-in-out",
        isScrolled
          ? "bg-white/90 dark:bg-[#0d0f14]/95 backdrop-blur-md shadow-sm shadow-black/10 dark:shadow-black/30 border-b border-slate-200/60 dark:border-white/[0.06]"
          : "bg-transparent"
      )}
    >
      <div className="flex items-center justify-between px-6 py-2">
        {/* Primary navigation */}
        <div className="flex items-center gap-1">
          <NavItem
            href="/stats"
            icon={faChartColumn}
            label="Stats"
            isActive={pathname === "/stats"}
          />
          <NavItem
            href="/heatmap"
            icon={faChartRadar}
            label="Map"
            isActive={pathname === "/heatmap"}
          />
          <NavItem
            href="/"
            icon={faKeyboard}
            label="Practice"
            isActive={pathname === "/"}
          />
          <NavItem
            href="/code"
            icon={faCode}
            label="Code"
            isActive={pathname === "/code"}
          />
          <NavItem
            href="/assistant"
            icon={faMicrochipAi}
            label="AI"
            isActive={pathname === "/assistant"}
            hidden={isMas && !premium}
          />
          <NavItem
            href="/pvp"
            icon={faSwords}
            label="Arena"
            isActive={pathname?.startsWith("/pvp") ?? false}
            badge={myActiveGames.length}
          />
        </div>

        {/* Utility actions */}
        <div className="flex items-center gap-1">
          {!streakLoading && (
            <Link
              href="/streak"
              title={
                isAtRisk && currentStreak > 0
                  ? "Practice today to keep your streak!"
                  : `${currentStreak} day streak`
              }
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold tabular-nums transition-colors duration-150",
                currentStreak === 0
                  ? "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  : isAtRisk
                  ? "text-orange-500 animate-pulse hover:bg-orange-500/10"
                  : "text-orange-400 hover:bg-orange-400/10"
              )}
            >
              <FontAwesomeIcon icon={faFire} className="w-4 h-4" />
              <span>{currentStreak}</span>
            </Link>
          )}

          <Suspense
            fallback={
              <div className="px-2.5 py-1.5">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="w-4 h-4 text-slate-400"
                  spin
                />
              </div>
            }
          >
            <User signIn={handleSignIn} account={handleAccount} />
          </Suspense>

          <button
            onClick={handleWhatsNew}
            title="What's New"
            className="flex items-center px-2.5 py-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-150"
          >
            <FontAwesomeIcon icon={faSparkles} className="w-4 h-4" />
          </button>

          <Link href="/settings" title="Settings">
            <div
              className={clsx(
                "flex items-center px-2.5 py-1.5 rounded-lg transition-colors duration-150",
                pathname === "/settings"
                  ? "text-sky-400 bg-sky-400/10"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* Center context — absolutely centered within the nav bar */}
      {pathname === "/" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {drillInfo ? (
            <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 select-none">
              <FontAwesomeIcon icon={faDumbbell} className="w-3 h-3 text-violet-400" />
              <span className="text-xs font-semibold text-violet-300">AI Drill</span>
              <span className="opacity-40 text-violet-400">•</span>
              <span className="text-xs text-violet-300/80">
                Focusing on{" "}
                {drillInfo.focus_keys.map(k => k.toUpperCase()).join(", ")}
              </span>
              <button
                onClick={() => setWords(null)}
                title="Exit drill"
                className="ml-1 flex items-center justify-center w-4 h-4 rounded-full text-violet-400/60 hover:text-violet-300 hover:bg-violet-400/10 transition-colors duration-150 cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handlePracticeSettings}
              className="pointer-events-auto flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.05] transition-colors duration-150 select-none"
            >
              <span>Level {hydratedSettings.levelName}</span>
              <span className="opacity-40">•</span>
              <span>
                {keyboards.find(
                  (k) => k.layout === hydratedSettings.keyboardName
                )?.name ?? hydratedSettings.keyboardName}
              </span>
              <span className="opacity-40">•</span>
              <span>
                {LANGUAGES.find(
                  (l) => l.value === hydratedSettings.language
                )?.label ?? hydratedSettings.language}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
