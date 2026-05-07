"use client";

import { useStreak, isStreakMilestone, getNextMilestone } from "@/lib/streak_hook";
import { faFire, faSnowflake } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { useEffect, useState } from "react";

interface StreakDisplayProps {
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  showMilestone?: boolean;
  className?: string;
}

export default function StreakDisplay({
  size = "md",
  showDetails = false,
  showMilestone = false,
  className,
}: StreakDisplayProps) {
  const {
    currentStreak,
    longestStreak,
    isAtRisk,
    freezesAvailable,
    isPremium,
    isLoading,
  } = useStreak();

  const [showCelebration, setShowCelebration] = useState(false);

  // Check for milestone celebration
  useEffect(() => {
    if (isStreakMilestone(currentStreak) && currentStreak > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStreak]);

  const sizeClasses = {
    sm: {
      container: "gap-1",
      icon: "w-4 h-4",
      text: "text-sm",
      badge: "text-xs px-1.5 py-0.5",
    },
    md: {
      container: "gap-2",
      icon: "w-6 h-6",
      text: "text-base",
      badge: "text-xs px-2 py-0.5",
    },
    lg: {
      container: "gap-3",
      icon: "w-10 h-10",
      text: "text-2xl font-bold",
      badge: "text-sm px-2.5 py-1",
    },
  };

  const sizes = sizeClasses[size];

  if (isLoading) {
    return (
      <div className={clsx("flex items-center", sizes.container, className)}>
        <div className={clsx("animate-pulse bg-gray-300 dark:bg-gray-600 rounded-full", sizes.icon)} />
        <div className={clsx("animate-pulse bg-gray-300 dark:bg-gray-600 rounded w-8 h-4")} />
      </div>
    );
  }

  const nextMilestone = getNextMilestone(currentStreak);

  return (
    <div className={clsx("flex items-center", sizes.container, className)}>
      {/* Fire icon with glow effect */}
      <div
        className={clsx(
          "relative transition-all duration-300",
          currentStreak > 0 && !isAtRisk && "animate-pulse",
          showCelebration && "scale-125"
        )}
      >
        <FontAwesomeIcon
          icon={faFire}
          className={clsx(
            sizes.icon,
            "transition-colors duration-300",
            currentStreak === 0
              ? "text-gray-400 dark:text-gray-500"
              : isAtRisk
              ? "text-orange-400 dark:text-orange-500"
              : "text-orange-500 dark:text-orange-400"
          )}
        />
        {/* Glow effect for active streak */}
        {currentStreak > 0 && !isAtRisk && (
          <div
            className={clsx(
              "absolute inset-0 blur-md rounded-full opacity-50 -z-10",
              "bg-orange-500"
            )}
          />
        )}
      </div>

      {/* Streak count */}
      <span
        className={clsx(
          sizes.text,
          "font-semibold transition-colors duration-300",
          currentStreak === 0
            ? "text-gray-500 dark:text-gray-400"
            : isAtRisk
            ? "text-orange-600 dark:text-orange-400"
            : "text-orange-500 dark:text-orange-400"
        )}
      >
        {currentStreak}
      </span>

      {/* Days label for larger sizes */}
      {size === "lg" && (
        <span className="text-gray-500 dark:text-gray-400 text-base font-normal">
          {currentStreak === 1 ? "day" : "days"}
        </span>
      )}

      {/* At risk warning badge */}
      {isAtRisk && currentStreak > 0 && (
        <span
          className={clsx(
            sizes.badge,
            "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
            "rounded-full font-medium animate-pulse"
          )}
        >
          Practice today!
        </span>
      )}

      {/* Streak freeze indicator */}
      {isPremium && freezesAvailable > 0 && size !== "sm" && (
        <div className="flex items-center gap-1 ml-2">
          <FontAwesomeIcon icon={faSnowflake} className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-blue-400">{freezesAvailable}</span>
        </div>
      )}

      {/* Extended details */}
      {showDetails && (
        <div className="flex flex-col ml-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Best: {longestStreak} days</span>
          {showMilestone && nextMilestone && (
            <span className="text-xs">
              Next milestone: {nextMilestone} days ({nextMilestone - currentStreak} to go)
            </span>
          )}
        </div>
      )}

      {/* Celebration animation */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="text-4xl animate-bounce">🎉</span>
        </div>
      )}
    </div>
  );
}

// Compact variant for tray/menu
export function StreakBadge({ className }: { className?: string }) {
  const { currentStreak, isAtRisk, isLoading } = useStreak();

  if (isLoading) {
    return null;
  }

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
        currentStreak === 0
          ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
          : isAtRisk
          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          : "bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400",
        className
      )}
    >
      <FontAwesomeIcon icon={faFire} className="w-4 h-4" />
      <span>{currentStreak}</span>
    </div>
  );
}

// Warning banner component for home page
export function StreakWarningBanner() {
  const { currentStreak, isAtRisk, isLoading } = useStreak();

  if (isLoading || !isAtRisk || currentStreak === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-3 flex items-center justify-center gap-3 animate-pulse">
      <FontAwesomeIcon icon={faFire} className="w-6 h-6" />
      <span className="font-medium">
        Don't break your {currentStreak}-day streak! Practice now to keep it going.
      </span>
      <FontAwesomeIcon icon={faFire} className="w-6 h-6" />
    </div>
  );
}
