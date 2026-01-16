"use client";

import { SettingsProvider, useSettings } from "@/lib/settings_hook";
import { SupabaseProvider } from "@/lib/supabase-provider";
import { WordProvider } from "@/lib/word-provider";
import { ResultsProvider } from "@/lib/result-provider";
import { useLayoutEffect } from "react";
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
  const { setModal } = useModal();
  const settings = useSettings();

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
