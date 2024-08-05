"use client"

import {loadStripe} from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { useCallback } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe('pk_test_51LYouDIsLeqpVAzJK9MonFdeWzOoVDmYW3FfDcJRbGHt9Nx2Km5FCvC7kPtHedlLTfsgvmmYlxpcsn54Gkfx5ZHT00P73XEu2v');

export function StripeCheckout() {
  const fetchClientSecret = useCallback(async () => {
    // Create a Checkout Session
    const token = await fetchAuthSession().then(
        (session) => session.tokens?.accessToken.toString() ?? "",
    )

    return fetch("https://rzm8iuf9z5.execute-api.ap-southeast-2.amazonaws.com/dev/create-checkout-session", {
      method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    })
      .then((res) => res.json())
      .then((data) => data.clientSecret);
  }, []);

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