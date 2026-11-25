"use client";

import TimeRangeSwitch from "@/components/TimeRangeSwitch";
import { Barline, BestForEachLevel } from "@/components/Charts";
import KeyTimingBars from "@/components/Charts/KeyTimingBars";
import SpeedDistribution from "@/components/Charts/SpeedDistribution";
import PremiumUpsell from "@/components/PremiumUpsell";
import { isPremiumPlan, usePlan } from "@/lib/plan_hook";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import PageHeader from "@/components/PageHeader";
import { faChartColumn } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";

import { RANGE_DAYS, type TimeRange } from "@/lib/time-range";

function PremiumCharts({ days, keyboard }: { days: number | null; keyboard: string }) {
  const plan = usePlan();

  // No plan yet means still loading or signed out: show nothing rather than a teaser.
  if (!plan) return null;

  if (!isPremiumPlan(plan)) {
    return (
      <PremiumUpsell
        source="stats"
        title="Deeper stats with Premium"
        body="See which letters slow you down, and how your speed compares with everyone else's."
      />
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
    <TimeRangeSwitch value={timeRange} onChange={setTimeRange} accent="sky" />
  );

  return (
    <div>
      <PageHeader
        icon={faChartColumn}
        title="Stats"
        subtitle="Your typing performance over time"
        iconBg="bg-sky-400/10"
        iconColor="text-sky-700 dark:text-sky-400"
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
