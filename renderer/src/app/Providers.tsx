"use client";

import { SettingsProvider, useSettings } from "@/lib/settings_hook";
import { SupabaseProvider } from "@/lib/supabase-provider";
import { WordProvider } from "@/lib/word-provider";
import { CodeProvider } from "@/lib/code-provider";
import { ResultsProvider } from "@/lib/result-provider";
import { useLayoutEffect, useCallback } from "react";
import {
  ModalController,
  ModalProvider,
  ModalType,
  useModal,
} from "@/lib/modal-provider";
import Menu from "@/components/Menu";
import PvPBanner from "@/components/PvP/PvPBanner";
import { MasProvider } from "@/lib/mas_hook";
import { PlanProvider } from "@/lib/plan_hook";
import { PvPProvider } from "@/lib/pvp-provider";
import { Toaster } from "sonner";
import { useDeepLink, DeepLinkData } from "@/lib/deep-link-hook";
import { StreakProvider } from "@/lib/streak_hook";
import { ProfileTimezoneProvider } from "@/lib/profile-timezone";
import { IapBridge } from "@/lib/iap-bridge";
import { PushBridge } from "@/lib/push-bridge";

export default function Providers({ children }) {
  return (
    <SupabaseProvider>
      <ProfileTimezoneProvider>
      <MasProvider>
      <IapBridge />
        <SettingsProvider>
          <PushBridge />
          <ResultsProvider>
            <PlanProvider>
              <StreakProvider>
                <PvPProvider>
                  <WordProvider>
                    <CodeProvider>
                      <ModalProvider>
                        <Toaster richColors position="top-center" />
                        <ModalSetup />
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          {children}
                        </div>
                      </ModalProvider>
                    </CodeProvider>
                  </WordProvider>
                </PvPProvider>
              </StreakProvider>
            </PlanProvider>
          </ResultsProvider>
        </SettingsProvider>
      </MasProvider>
      </ProfileTimezoneProvider>
    </SupabaseProvider>
  );
}

function ModalSetup() {
  const { setModal } = useModal();
  const settings = useSettings();

  // Handle deep links from Electron (e.g., touchtyper://practice?duration=5)
  const handlePracticeStart = useCallback((data: DeepLinkData) => {
    console.log("Practice session requested via deep link:", data);
    // The deep link will navigate to the home page
    // Additional practice mode handling could be added here
    // For example, storing the duration in context for the practice component to use
  }, []);

  // Register deep link handlers
  useDeepLink({
    onPracticeStart: handlePracticeStart,
  });

  useLayoutEffect(() => {
    let cancelled = false;
    const firstTimeOpen = sessionStorage.getItem("firstTimeOpen") === null;
    if (!settings.whatsNewOnStartup || !firstTimeOpen) return;

    // Cold-start via touchtyper:// deep link must NOT trigger WHATS_NEW —
    // the modal would otherwise obscure the deep-link destination page
    // (PvP invite, challenge, etc.) before the user can see it. When the
    // electronAPI is unavailable (web/HMR), fall through to the normal
    // open since deep links can't be the launch vector there.
    const shouldOpen = async () => {
      const viaDeepLink = await window.electronAPI?.launchedWithDeepLink?.();
      if (cancelled || viaDeepLink) return;
      setModal(ModalType.WHATS_NEW);
    };
    void shouldOpen();
    return () => {
      cancelled = true;
    };
  }, [settings.whatsNewOnStartup]);

  return (
    <>
      <Menu
        handleSignIn={() => setModal(ModalType.SIGN_IN)}
        handleAccount={() => setModal(ModalType.ACCOUNT)}
        handleWhatsNew={() => setModal(ModalType.WHATS_NEW)}
        handlePracticeSettings={() => setModal(ModalType.PRACTICE_SETTINGS)}
      />
      <div className="px-6 pt-2">
        <PvPBanner />
      </div>
      <ModalController />
    </>
  );
}
