"use client";

import { SettingsProvider, useSettings } from "@/lib/settings_hook";
import { SupabaseProvider } from "@/lib/supabase-provider";
import { WordProvider } from "@/lib/word-provider";
import { ResultsProvider } from "@/lib/result-provider";
import { useLayoutEffect, useCallback } from "react";
import {
  ModalController,
  ModalProvider,
  ModalType,
  useModal,
} from "@/lib/modal-provider";
import Menu from "@/components/Menu";
import { MasProvider } from "@/lib/mas_hook";
import { PlanProvider } from "@/lib/plan_hook";
import { Toaster } from "sonner";
import { useDeepLink, DeepLinkData } from "@/lib/deep-link-hook";
import { useSupabase } from "@/lib/supabase-provider";

export default function Providers({ children }) {
  return (
    <SupabaseProvider>
      <MasProvider>
        <SettingsProvider>
          <ResultsProvider>
            <PlanProvider>
              <WordProvider>
                <ModalProvider>
                  <Toaster richColors position="top-center" />
                  <ModalSetup />
                  {children}
                </ModalProvider>
              </WordProvider>
            </PlanProvider>
          </ResultsProvider>
        </SettingsProvider>
      </MasProvider>
    </SupabaseProvider>
  );
}

function ModalSetup() {
  const { setModal, closeModal } = useModal();
  const settings = useSettings();
  const { supabase } = useSupabase();

  // Handle deep links from Electron (e.g., touchtyper://practice?duration=5)
  const handlePracticeStart = useCallback((data: DeepLinkData) => {
    console.log("Practice session requested via deep link:", data);
  }, []);

  // Handle auth callback deep link (sign in from website magic link / reset)
  const handleAuthCallback = useCallback(
    async (accessToken: string, refreshToken: string) => {
      try {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        closeModal();
        setModal(ModalType.ACCOUNT);
      } catch (err) {
        console.error("Auth callback setSession failed:", err);
      }
    },
    [supabase, closeModal, setModal]
  );

  // Register deep link handlers
  useDeepLink({
    onPracticeStart: handlePracticeStart,
    onAuthCallback: handleAuthCallback,
  });

  useLayoutEffect(() => {
    const firstTimeOpen = sessionStorage.getItem("firstTimeOpen") === null;
    if (settings.whatsNewOnStartup && firstTimeOpen)
      setModal(ModalType.WHATS_NEW);
  }, [settings.whatsNewOnStartup]);

  return (
    <>
      <Menu
        handleSignIn={() => setModal(ModalType.SIGN_IN)}
        handleAccount={() => setModal(ModalType.ACCOUNT)}
        handleWhatsNew={() => setModal(ModalType.WHATS_NEW)}
      />
      <ModalController />
    </>
  );
}
