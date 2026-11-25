"use client";

import TimeRangeSwitch from "@/components/TimeRangeSwitch";
import { HeatmapCanvas } from "@/components/HeatmapCanvas";
import KeyConfusionHeatmap from "@/components/KeyConfusionHeatmap";
import KeyConsistencyHeatmap from "@/components/KeyConsistencyHeatmap";
import KeyFingerHeatmap from "@/components/KeyFingerHeatmap";
import KeyFrequencyHeatmap from "@/components/KeyFrequencyHeatmap";
import KeyImprovementHeatmap from "@/components/KeyImprovementHeatmap";
import KeyTimingHeatmap from "@/components/KeyTimingHeatmap";
import KeyMapSelect from "@/components/KeyMapSelect";
import PremiumUpsell from "@/components/PremiumUpsell";
import { isPremiumPlan, usePlan } from "@/lib/plan_hook";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import PageHeader from "@/components/PageHeader";
import { faChartRadar } from "@fortawesome/pro-regular-svg-icons";
import { useState } from "react";

import { KEY_MAPS, type KeyMapId } from "@/lib/key-maps";
import { RANGE_DAYS, type TimeRange } from "@/lib/time-range";

export default function HeatmapPage() {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [mapId, setMapId] = useState<KeyMapId>("missed");
  const plan = usePlan();
  const isPremium = plan ? isPremiumPlan(plan) : false;

  const timeRangeButtons = (
    <TimeRangeSwitch value={timeRange} onChange={setTimeRange} accent="rose" />
  );

  const renderMap = () => {
    const info = KEY_MAPS.find((m) => m.id === mapId) ?? KEY_MAPS[0];

    if (info.premium) {
      // No plan yet means still loading or signed out: show nothing rather than a teaser.
      if (!plan) return null;
      if (!isPremium) {
        return (
          <PremiumUpsell
            source="key-map"
            title={`${info.label} map with Premium`}
            body={info.upsell ?? "Unlock this map with Premium."}
          />
        );
      }
    }

    switch (info.id) {
      case "missed":
        return <HeatmapCanvas keyboardName={keyboard} timeRange={timeRange} />;
      case "frequency":
        return <KeyFrequencyHeatmap keyboardName={keyboard} timeRange={timeRange} />;
      case "timing":
        return <KeyTimingHeatmap days={RANGE_DAYS[timeRange]} keyboardName={keyboard} />;
      case "improvement":
        return <KeyImprovementHeatmap keyboardName={keyboard} timeRange={timeRange} />;
      case "consistency":
        return <KeyConsistencyHeatmap keyboardName={keyboard} timeRange={timeRange} />;
      case "fingers":
        return <KeyFingerHeatmap keyboardName={keyboard} timeRange={timeRange} />;
      case "confusion":
        return <KeyConfusionHeatmap keyboardName={keyboard} timeRange={timeRange} />;
    }
  };

  return (
    <div>
      <PageHeader
        icon={faChartRadar}
        title="Key Map"
        subtitle="See which keys you miss most"
        iconBg="bg-rose-400/10"
        iconColor="text-rose-700 dark:text-rose-400"
        headerRight={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="w-44">
              <KeyMapSelect value={mapId} onChange={setMapId} isPremium={isPremium} />
            </div>
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

      <div className="px-6 pb-6">{renderMap()}</div>
    </div>
  );
}
