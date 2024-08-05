import { StripeCheckout } from "@/components/Payment";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StripeCheckout />
        </Suspense>
    )
}