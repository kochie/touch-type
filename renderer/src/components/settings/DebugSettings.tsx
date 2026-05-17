"use client";

import { useState, useEffect } from "react";
import { Field, Label, Description } from "@headlessui/react";
import type { DebugInfo } from "../../../types/electron";
import Button from "../Button";
import { useSupabase } from "@/lib/supabase-provider";

type EmailTestStatus = "idle" | "sending" | "sent" | "error";

interface EmailButtonProps {
  label: string;
  description: string;
  onSend: () => Promise<void>;
}

function EmailTestButton({ label, description, onSend }: EmailButtonProps) {
  const [status, setStatus] = useState<EmailTestStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = async () => {
    setStatus("sending");
    setErrorMsg(null);
    try {
      await onSend();
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <Field as="div" className="flex items-center justify-between">
      <span className="flex flex-grow flex-col">
        <Label className="text-sm font-medium text-white">{label}</Label>
        <Description className="text-sm text-gray-500">{description}</Description>
        {status === "error" && errorMsg && (
          <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
        )}
      </span>
      <div className="w-40 flex-shrink-0">
        <Button
          onClick={handleClick}
          disabled={status === "sending"}
        >
          {status === "sending" ? "Sending…" : status === "sent" ? "Sent ✓" : status === "error" ? "Failed" : "Send Test"}
        </Button>
      </div>
    </Field>
  );
}

export function DebugSettings() {
  const [isElectron, setIsElectron] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const { supabase, user } = useSupabase();

  useEffect(() => {
    const checkEnvironment = async () => {
      if (typeof window !== "undefined" && window.electronAPI) {
        setIsElectron(true);
        try {
          const info = await window.electronAPI.getDebugInfo();
          setDebugInfo(info);
          // Show debug tools when either:
          //   - running under `pnpm dev` (unpackaged renderer), OR
          //   - running a packaged Mac App Development build (mas-dev) — these
          //     are signed and sandboxed but still intended for dev testing.
          //     `isDev` is always false for any packaged build, so we'd never
          //     see debug tooling in mas-dev without checking isMasDev.
          setShowDebug(info.isDev || info.isMasDev);
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
  };

  const email = user?.email;

  const sendConfirmSignup = async () => {
    if (!email) throw new Error("No user email — sign in first");
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw error;
  };

  const sendPasswordReset = async () => {
    if (!email) throw new Error("No user email — sign in first");
    // window.location.origin in Electron is the app:// scheme which Supabase
    // rejects; point at the website's actual set-password route instead.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://touch-typer.kochie.io/auth/callback?next=/auth/set-password",
    });
    if (error) throw error;
  };

  const sendMagicLink = async () => {
    if (!email) throw new Error("No user email — sign in first");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  if (!isElectron || !showDebug) return null;

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

        {/* Environment info */}
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
            <Label className="text-sm font-medium text-white">Test Notification</Label>
            <Description className="text-sm text-gray-500">
              Send a test notification to verify the notification system is working.
            </Description>
          </span>
          <div className="w-40 flex-shrink-0">
            <Button onClick={handleTestNotification}>Send Test</Button>
          </div>
        </Field>

        {/* Email Templates */}
        <div>
          <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wide">
            Email Templates
            {email && (
              <span className="ml-2 normal-case font-normal text-gray-600">
                → {email}
              </span>
            )}
          </p>
          <div className="space-y-4">
            <EmailTestButton
              label="Confirm Signup"
              description="Resend the signup confirmation email with OTP code."
              onSend={sendConfirmSignup}
            />
            <EmailTestButton
              label="Password Reset"
              description="Send a password reset link email."
              onSend={sendPasswordReset}
            />
            <EmailTestButton
              label="Magic Link"
              description="Send a magic link / OTP login email."
              onSend={sendMagicLink}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default DebugSettings;
