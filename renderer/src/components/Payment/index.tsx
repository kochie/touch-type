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
