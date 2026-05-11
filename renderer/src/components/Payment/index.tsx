"use client"

import {loadStripe} from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useCallback } from 'react';
import { useSupabaseClient } from '@/lib/supabase-provider';

// Must be initialised outside of a component to avoid recreating on every render.
// Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — it must belong to the same Stripe account
// as the STRIPE_SECRET_KEY used by the backend edge functions.
const stripeKey = process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"];
if (!stripeKey) throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");

export const stripePromise = loadStripe(stripeKey);

export function StripeCheckout() {
  const supabase = useSupabaseClient();

  const fetchClientSecret = useCallback(async () => {

    const {data, error} = await supabase.functions.invoke('create-checkout-session');

    if (error) {
      throw error;
    }

    return data.clientSecret;
  }, [supabase]);

  const options = {fetchClientSecret};

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
