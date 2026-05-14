"use client";

import { useEffect } from "react";
import { useSupabase } from "./supabase-provider";
import { metrics } from "./metrics";

/**
 * Bridge between Electron's StoreKit transactions queue and the Supabase
 * backend. Listens to the main-process `iap-transaction-purchased` event,
 * registers the transaction via the `map-transaction` edge function (using
 * the renderer's authenticated JWT, which the main process doesn't hold),
 * then asks the main process to finish the transaction so StoreKit stops
 * re-delivering it.
 *
 * Forwarded events cover BOTH initial purchases and Restore Purchases —
 * StoreKit re-delivers historical transactions in the `restored` state and
 * we register each one the same way.
 *
 * At-least-once delivery: if map-transaction fails (network, 401, server
 * error), we do NOT call finishIapTransaction. StoreKit will redeliver the
 * transaction on every app launch until we finish it, so a transient
 * failure is automatically retried on next launch.
 */
export function IapBridge() {
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI?.onIapTransactionPurchased) {
      return;
    }

    const wrapper = window.electronAPI.onIapTransactionPurchased(async (payload) => {
      const { transactionId, productId, transactionDate, state } = payload;
      metrics.count("iap.bridge.received", 1, { state, product: productId });

      if (!user) {
        // No session — likely first launch before sign-in. Don't finish the
        // transaction; let StoreKit redeliver after the user authenticates.
        console.warn("IapBridge: no Supabase session, deferring map-transaction for", transactionId);
        metrics.count("iap.bridge.deferred_no_session", 1, { state, product: productId });
        return;
      }

      try {
        const { error } = await supabase.functions.invoke("map-transaction", {
          body: { transactionId, productId },
        });
        if (error) throw error;

        // Tell main to finish the transaction now that backend has it.
        await window.electronAPI?.finishIapTransaction?.(transactionDate);

        // For subscriptions, also surface the existing "purchase complete"
        // signal so any open premium modal can refresh its subscription
        // row. (Streak freeze packs already refresh via their own modal's
        // state machine after purchaseStreakFreeze resolves.)
        if (productId.includes("premium_")) {
          window.dispatchEvent(new CustomEvent("touchtyper:iap-subscription-purchased"));
        } else if (productId.includes("streak_freeze")) {
          window.dispatchEvent(new CustomEvent("touchtyper:iap-freeze-purchased"));
        }

        metrics.count("iap.bridge.finished", 1, { state, product: productId });
      } catch (err) {
        console.error("IapBridge: map-transaction failed, will retry on next launch:", err);
        metrics.count("iap.bridge.map_failed", 1, { state, product: productId });
        // Intentionally do NOT finishIapTransaction — StoreKit redelivery
        // handles the retry.
      }
    });

    return () => {
      window.electronAPI?.offIapTransactionPurchased?.(wrapper);
    };
  }, [supabase, user]);

  return null;
}
