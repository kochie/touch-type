"use client";

import { Barline, BestForEachLevel } from "@/components/Charts";
import KeyTimingBars from "@/components/Charts/KeyTimingBars";
import SpeedDistribution from "@/components/Charts/SpeedDistribution";
import Button from "@/components/Button";
import { ModalType, useModal } from "@/lib/modal-provider";
import { isPremiumPlan, usePlan } from "@/lib/plan_hook";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import PageHeader from "@/components/PageHeader";
import { faChartColumn, faLock } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";
import clsx from "clsx";

type TimeRange = "7d" | "30d" | "90d" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const RANGE_DAYS: Record<TimeRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

function PremiumCharts({ days, keyboard }: { days: number | null; keyboard: string }) {
  const plan = usePlan();
  const { setModal } = useModal();

  // No plan yet means still loading or signed out: show nothing rather than a teaser.
  if (!plan) return null;

  if (!isPremiumPlan(plan)) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/25 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-400/10 flex items-center justify-center flex-shrink-0">
          <FontAwesomeIcon icon={faLock} className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-100">Deeper stats with Premium</p>
          <p className="text-xs text-slate-400">
            See which letters slow you down, and how your speed compares with
            everyone else&apos;s.
          </p>
        </div>
        <div className="w-48">
          <Button onClick={() => setModal(ModalType.PREMIUM_PURCHASE, "stats")}>
            Upgrade to Premium
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <KeyTimingBars days={days} keyboard={keyboard} />
      <SpeedDistribution days={days} />
    </>
  );
}

const StatsPage = () => {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const timeRangeButtons = (
    <div className="flex gap-1.5">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => setTimeRange(range.value)}
          className={clsx(
            "h-9 px-3 rounded-lg text-xs font-semibold transition-colors duration-150",
            timeRange === range.value
              ? "bg-sky-400/10 text-sky-400 border border-sky-400/30"
              : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={faChartColumn}
        title="Stats"
        subtitle="Your typing performance over time"
        iconBg="bg-sky-400/10"
        iconColor="text-sky-400"
        headerRight={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="w-48">
              <KeyboardSelect
                selectedKeyboardName={keyboard}
                setSelectedKeyboard={setKeyboard}
                label="Keyboard Layout"
                hideLabel
              />
            </div>
            {timeRangeButtons}
          </div>
        }
      />

      <div className="px-6">
        <div className="mx-auto flex w-full flex-col gap-6 pb-6 pt-2 lg:w-[80%]">
          <BestForEachLevel keyboard={keyboard} />
          <Barline keyboard={keyboard} />
          <PremiumCharts days={RANGE_DAYS[timeRange]} keyboard={keyboard} />
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
