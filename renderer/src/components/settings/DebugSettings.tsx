"use client";

import { useState, useEffect } from "react";
import { Field, Label, Description } from "@headlessui/react";
import Button from "../Button";

interface DebugInfo {
  isDev: boolean;
  platform: string;
  electronVersion: string;
  nodeVersion: string;
}

export function DebugSettings() {
  const [isElectron, setIsElectron] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isDev, setIsDev] = useState(false);

  // Check if we're in Electron environment and get debug info
  useEffect(() => {
    const checkEnvironment = async () => {
      if (typeof window !== "undefined" && window.electronAPI) {
        setIsElectron(true);

        try {
          const info = await window.electronAPI.getDebugInfo();
          setDebugInfo(info);
          setIsDev(info.isDev);
        } catch (err) {
          console.error("Failed to get debug info:", err);
        }
      }
    };

    checkEnvironment();
  }, []);

  const handleTestNotification = async () => {
    if (!window.electronAPI) return;
    
    new Notification("Test Notification", {
      body: "This is a test notification from Debug Mode",
    });
    console.log("Test notification sent");
  };

  // Don't render anything if not in Electron or not in dev mode
  if (!isElectron || !isDev) {
    return null;
  }

  return (
    <>
      <hr className="border-white/10" />
      <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
            DEV
          </span>
          Debug Mode
        </h3>
        <p className="text-sm text-gray-400">
          Development-only settings and tools for testing.
        </p>
      </div>

      {/* Debug Info Display */}
      {debugInfo && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
            Environment Info
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-400">Platform:</span>
            <span className="text-white">{debugInfo.platform}</span>
            <span className="text-gray-400">Electron:</span>
            <span className="text-white">v{debugInfo.electronVersion}</span>
            <span className="text-gray-400">Node:</span>
            <span className="text-white">v{debugInfo.nodeVersion}</span>
          </div>
        </div>
      )}

      {/* Test Notification */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">
            Test Notification
          </Label>
          <Description className="text-sm text-gray-500">
            Send a test notification to verify the notification system is working.
          </Description>
        </span>
        <div className="w-40">
          <Button onClick={handleTestNotification}>Send Test</Button>
        </div>
      </Field>
      </div>
    </>
  );
}

export default DebugSettings;
