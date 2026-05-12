"use client";

import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import { faFire, faSnowflake } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useStreak, getNextMilestone, STREAK_MILESTONES } from "@/lib/streak_hook";
import { useResults } from "@/lib/result-provider";
import { DateTime } from "luxon";
import ActivityCalendar from "@/components/ActivityCalendar";
import clsx from "clsx";
import { ModalType, useModal } from "@/lib/modal-provider";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function StreakPageInner() {
  const {
    currentStreak,
    longestStreak,
    lastActivityDate,
    isAtRisk,
    freezesAvailable,
    isPremium,
    isLoading,
  } = useStreak();
  const { results } = useResults();
  const { setModal } = useModal();

  // Build a week indicator: which days this week are "done"
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  // Map Sunday=0 to index 6, Monday=1 to index 0, etc.
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (isLoading) {
    return (
      <div className="px-6 animate-pulse space-y-4">
        <div className="h-40 bg-slate-100 dark:bg-white/5 rounded-xl" />
        <div className="h-24 bg-slate-100 dark:bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={faFire}
        title="Streak"
        subtitle="Keep the fire alive — practice every day"
        iconBg="bg-orange-400/10"
        iconColor="text-orange-400"
      />

      <div className="px-6 grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {/* Streak hero */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 flex flex-col items-center text-center">
          <FontAwesomeIcon
            icon={faFire}
            className={clsx(
              "w-10 h-10 mb-2",
              isAtRisk ? "text-orange-500 animate-pulse" : "text-orange-400"
            )}
          />
          <div className="text-5xl font-extrabold text-orange-400 leading-none">
            {currentStreak}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
            day streak
          </div>

          {/* Week dots */}
          <div className="flex gap-2 mt-4">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase",
                  i === todayIndex
                    ? "bg-orange-400 text-white"
                    : i < todayIndex
                    ? "bg-orange-400/20 text-orange-400"
                    : "bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/[0.06]"
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {isAtRisk && (
            <p className="text-xs text-orange-500 mt-3">
              Practice today to keep your streak!
            </p>
          )}
        </div>

        {/* Streak freezes */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Streak Freezes
          </div>
          <div className="text-3xl font-extrabold text-sky-400 leading-none mb-1">
            {freezesAvailable}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-4">available</div>

          <div className="flex gap-2 flex-wrap mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                  i < (freezesAvailable ?? 0)
                    ? "bg-sky-400/15 border border-sky-400/30 text-sky-400"
                    : "bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-300 dark:text-slate-700 opacity-50"
                )}
              >
                <FontAwesomeIcon icon={faSnowflake} className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>

          <button
            onClick={() => setModal(ModalType.STREAK_FREEZE_PURCHASE)}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-sky-400/10 border border-sky-400/30 text-xs font-semibold text-sky-400 hover:bg-sky-400/20 hover:border-sky-400/50 transition-colors duration-150 cursor-pointer"
          >
            <span>+</span>
            <span>Get more freezes</span>
          </button>
        </div>

        {/* Longest streak + stats */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5 flex flex-col gap-5">
          {/* Best streak */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Best Streak
            </div>
            <div className="text-4xl font-extrabold text-orange-400 leading-none">
              {longestStreak}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">days — all time best</div>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Next milestone */}
          {(() => {
            const next = getNextMilestone(currentStreak);
            const prev = STREAK_MILESTONES.filter(m => m <= currentStreak).at(-1) ?? 0;
            const progress = next ? (currentStreak - prev) / (next - prev) : 1;
            return (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  Next Milestone
                </div>
                {next ? (
                  <>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-200">{next} days</span>
                      <span className="text-xs text-slate-500">{currentStreak} / {next}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all"
                        style={{ width: `${Math.min(progress * 100, 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-semibold text-orange-400">All milestones reached!</div>
                )}
              </div>
            );
          })()}

          <div className="border-t border-white/[0.06]" />

          {/* Session stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                Total Sessions
              </div>
              <div className="text-2xl font-extrabold text-slate-200">{results.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                Last Practiced
              </div>
              <div className="text-sm font-semibold text-slate-300">
                {lastActivityDate
                  ? (() => {
                      const days = Math.floor(
                        DateTime.now().startOf("day").diff(DateTime.fromISO(lastActivityDate), "days").days
                      );
                      return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
                    })()
                  : "Never"}
              </div>
            </div>
          </div>
        </div>

        {/* Activity calendar */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            Activity
          </div>
          <ActivityCalendar />
        </div>
      </div>
    </div>
  );
}

export default function StreakPage() {
  return (
    <Suspense>
      <StreakPageInner />
    </Suspense>
  );
}
