"use client";

import { Barline, LineChart } from "@/components/Charts";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import TopStats from "@/components/Stats";
import { KeyboardLayoutNames } from "@/keyboards";
import React, { useState } from "react";

const StatsPage = () => {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);

  return (
    <div>
      <div className="py-10">
        <TopStats />
        <div className="max-w-4xl mx-auto my-7">
          <KeyboardSelect
            selectedKeyboardName={keyboard}
            setSelectedKeyboard={setKeyboard}
            label="Keyboard Layout"
            description="Show statistics for a specific keyboard layout"
          />
        </div>
        <Barline keyboard={keyboard} />
        <LineChart />
      </div>
    </div>
  );
};

export default StatsPage;
