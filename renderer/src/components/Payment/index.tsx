"use client"

import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { useCallback } from "react";
import { useSupabaseClient } from "@/lib/supabase-provider";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
const stripePromise = loadStripe(stripePublishableKey);

export const STRIPE_LOOKUP_KEYS = {
  monthly: "premium_monthly",
  yearly: "premium_yearly",
} as const;

interface StripeCheckoutProps {
  /** Stripe price lookup key (e.g. premium_monthly, premium_yearly) */
  lookupKey: string;
  /** Called when checkout completes successfully; use to refetch plan */
  onComplete?: () => void;
}

export function StripeCheckout({ lookupKey, onComplete }: StripeCheckoutProps) {
  const supabase = useSupabaseClient();

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      { body: { lookup_key: lookupKey } }
    );

    if (error) {
      throw error;
    }

    return data?.clientSecret ?? null;
  }, [supabase, lookupKey]);

  const handleComplete = useCallback(async () => {
    try {
      await supabase.functions.invoke("confirm-checkout-session", {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to confirm checkout session:", err);
    }
    onComplete?.();
  }, [supabase, onComplete]);

  const options = {
    fetchClientSecret,
    ...(onComplete && { onComplete: handleComplete }),
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

/** One-off payment checkout for streak freeze purchase (Stripe). */
export function StreakFreezeCheckout({ onComplete }: { onComplete?: () => void }) {
  const supabase = useSupabaseClient();

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke(
      "create-streak-freeze-checkout",
      { method: "POST" }
    );
    if (error) throw error;
    return data?.clientSecret ?? null;
  }, [supabase]);

  return (
    <div id="streak-freeze-checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{
          fetchClientSecret,
          ...(onComplete && { onComplete }),
        }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
