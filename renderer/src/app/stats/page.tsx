"use client";

import { Barline, BestForEachLevel, LineChart } from "@/components/Charts";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import TopStats from "@/components/Stats";
import { KeyboardLayoutNames } from "@/keyboards";
import React, { useState } from "react";

const StatsPage = () => {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);

  return (
    <div className="mt-5">
      {/* <TopStats keyboard={keyboard}/> */}
      <div className="max-w-4xl mx-auto">
        <KeyboardSelect
          selectedKeyboardName={keyboard}
          setSelectedKeyboard={setKeyboard}
          label="Keyboard Layout"
          description="Show statistics for a specific keyboard layout"
        />
      </div>
      <div className="py-10">
        <BestForEachLevel keyboard={keyboard} />
      </div>
      <Barline keyboard={keyboard} />
    </div>
  );
};

export default StatsPage;
