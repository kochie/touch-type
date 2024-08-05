"use client";
import { HeatmapCanvas } from "@/components/HeatmapCanvas";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import { useState } from "react";

export default function HeatmapPage() {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);

  return (
    <div className="">
      <div className="max-w-4xl mx-auto my-5">
        <KeyboardSelect
          selectedKeyboardName={keyboard}
          setSelectedKeyboard={setKeyboard}
        />
      </div>

      <div className="">
        <HeatmapCanvas keyboardName={keyboard} />
      </div>
    </div>
  );
}
