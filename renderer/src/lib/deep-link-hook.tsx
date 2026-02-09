"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface DeepLinkData {
  action: "practice" | "settings" | "stats" | "auth-callback";
  duration?: number;
  mode?: "timed" | "words" | "endless";
  access_token?: string;
  refresh_token?: string;
}

export interface DeepLinkHandlers {
  onPracticeStart?: (data: DeepLinkData) => void;
  onNavigate?: (path: string) => void;
  onAuthCallback?: (accessToken: string, refreshToken: string) => void;
}

/**
 * Hook to handle deep links from the Electron main process
 *
 * @param handlers - Optional handlers for deep link events
 */
export function useDeepLink(handlers?: DeepLinkHandlers): void {
  const router = useRouter();

  const handleDeepLink = useCallback(
    (data: DeepLinkData) => {
      console.log("Deep link received:", data);

      switch (data.action) {
        case "practice":
          // Navigate to home page for practice
          router.push("/");
          // Call the practice handler if provided
          handlers?.onPracticeStart?.(data);
          break;

        case "settings":
          router.push("/settings");
          break;

        case "stats":
          router.push("/stats");
          break;

        case "auth-callback":
          if (data.access_token && data.refresh_token) {
            handlers?.onAuthCallback?.(data.access_token, data.refresh_token);
          }
          break;

        default:
          console.warn("Unknown deep link action:", data);
      }
    },
    [router, handlers]
  );

  const handleNavigate = useCallback(
    (path: string) => {
      console.log("Navigation request:", path);
      router.push(path);
      handlers?.onNavigate?.(path);
    },
    [router, handlers]
  );

  useEffect(() => {
    // Only run in Electron environment
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    // Register deep link handler
    window.electronAPI.onDeepLink(handleDeepLink);

    // Register navigation handler (for tray menu)
    window.electronAPI.onNavigate(handleNavigate);

    // Note: We don't need to clean up IPC listeners in this case
    // as they persist for the lifetime of the app
  }, [handleDeepLink, handleNavigate]);
}

/**
 * Hook to get the deep link data that launched the app
 * Useful for handling initial state when app opens via deep link
 */
export function useInitialDeepLink(): DeepLinkData | null {
  // This could be enhanced to store the initial deep link data
  // For now, the handleInitialDeepLink in the main process handles this
  return null;
}
