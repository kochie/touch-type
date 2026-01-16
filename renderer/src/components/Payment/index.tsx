"use client"

import {loadStripe} from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useCallback } from 'react';
import { useSupabaseClient } from '@/lib/supabase-provider';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe('pk_test_51LYouDIsLeqpVAzJK9MonFdeWzOoVDmYW3FfDcJRbGHt9Nx2Km5FCvC7kPtHedlLTfsgvmmYlxpcsn54Gkfx5ZHT00P73XEu2v');

export function StripeCheckout() {
  const supabase = useSupabaseClient();

  const fetchClientSecret = useCallback(async () => {
    // Get the access token from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";

    // Create a Checkout Session using Supabase Edge Function
    return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => data.clientSecret);
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
