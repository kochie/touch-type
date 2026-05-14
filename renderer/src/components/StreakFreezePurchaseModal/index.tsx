"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSnowflake,
  faSpinnerThird,
  faCheckCircle,
} from "@fortawesome/pro-duotone-svg-icons";
import { faXmark, faChevronLeft } from "@fortawesome/pro-regular-svg-icons";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import clsx from "clsx";
import { useMas } from "@/lib/mas_hook";
import { useSupabaseClient } from "@/lib/supabase-provider";
import { stripePromise } from "@/components/Payment";

interface FreezePackage {
  quantity: number;
  price: string;
  label: string;
  savings: string | null;
  masProductId: string;
  highlight?: boolean;
}

const PACKAGES: FreezePackage[] = [
  {
    quantity: 1,
    price: "$1.00",
    label: "1 Freeze",
    savings: null,
    masProductId: "io.kochie.touch-typer.freeze1",
  },
  {
    quantity: 3,
    price: "$2.00",
    label: "3 Freezes",
    savings: "Save 33%",
    masProductId: "io.kochie.touch-typer.freeze3",
  },
  {
    quantity: 10,
    price: "$6.00",
    label: "10 Freezes",
    savings: "Save 40%",
    masProductId: "io.kochie.touch-typer.freeze10",
    highlight: true,
  },
];

const STRIPE_APPEARANCE: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#38bdf8",
    colorBackground: "#1e293b",
    colorText: "#f1f5f9",
    colorTextSecondary: "#94a3b8",
    colorDanger: "#f87171",
    borderRadius: "8px",
    fontSizeBase: "13px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid rgba(255,255,255,0.1)", boxShadow: "none" },
    ".Input:focus": { border: "1px solid #38bdf8", boxShadow: "0 0 0 1px #38bdf8" },
    ".Label": { color: "#94a3b8", fontWeight: "500" },
    ".Tab": { border: "1px solid rgba(255,255,255,0.08)" },
    ".Tab--selected": { border: "1px solid #38bdf8", color: "#38bdf8" },
  },
};

function CheckoutForm({
  clientSecret,
  price,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  price: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

      const returnUrl = `${process.env["NEXT_PUBLIC_SUPABASE_URL"]}/functions/v1/finalize-streak-freeze-checkout`;

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) throw new Error(error.message);

      if (paymentIntent?.status === "succeeded") {
        const { error: fnError } = await supabase.functions.invoke(
          "finalize-streak-freeze-checkout",
          { body: { paymentIntentId: paymentIntent.id } },
        );
        if (fnError) {
          const body = await (fnError as any).context?.json?.().catch(() => null);
          throw new Error(body?.error ?? "Freezes could not be applied. Contact support.");
        }
        onSuccess();
      }
    } catch (err: any) {
      onError(err?.message ?? "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
      <PaymentElement
        options={{ layout: "tabs" }}
        onLoadError={(e) => onError(e.error?.message ?? "Payment form failed to load. Check your Stripe publishable key.")}
      />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-2.5 rounded-lg bg-sky-400 text-slate-900 text-sm font-bold hover:bg-sky-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <FontAwesomeIcon icon={faSpinnerThird} spin className="w-4 h-4" />
            Processing…
          </>
        ) : (
          `Pay ${price}`
        )}
      </button>
    </form>
  );
}

type Phase = "pick" | "checkout" | "mas-purchasing" | "success" | "error";

export default function StreakFreezePurchaseModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [loadingQty, setLoadingQty] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<FreezePackage | null>(null);
  const isMas = useMas();
  const supabase = useSupabaseClient();

  // 3DS fallback: Electron intercepts the Stripe redirect and notifies us here
  useEffect(() => {
    window.electronAPI?.onFreezePurchaseComplete?.(() => setPhase("success"));
  }, []);

  const handleBuy = async (pkg: FreezePackage) => {
    setLoadingQty(pkg.quantity);
    setErrorMsg(null);
    try {
      if (isMas) {
        const result = await window.electronAPI?.purchaseStreakFreeze?.(pkg.masProductId);
        if (!result?.queued) {
          throw new Error(result?.error ?? "Purchase could not be initiated.");
        }
        setPhase("mas-purchasing");
      } else {
        const { data, error } = await supabase.functions.invoke(
          "create-streak-freeze-checkout",
          { body: { quantity: pkg.quantity } },
        );
        if (error) {
          const body = await (error as any).context?.json?.().catch(() => null);
          throw new Error(body?.error ?? error.message);
        }
        setClientSecret(data.clientSecret);
        setSelectedPkg(pkg);
        setPhase("checkout");
      }
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
      setPhase("error");
    } finally {
      setLoadingQty(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          {phase === "checkout" && (
            <button
              onClick={() => { setPhase("pick"); setClientSecret(null); setSelectedPkg(null); }}
              className="text-slate-400 hover:text-slate-200 transition-colors mr-1"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-sky-400/10 flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faSnowflake} className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-100">Get Streak Freezes</p>
            <p className="text-xs text-slate-400">Skip a day without breaking your streak</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      </div>

      {/* Phase: package picker */}
      {phase === "pick" && (
        <div className="flex flex-col gap-3 px-6 pb-6">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.quantity}
              onClick={() => handleBuy(pkg)}
              disabled={loadingQty !== null}
              className={clsx(
                "relative flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                pkg.highlight
                  ? "bg-sky-400/10 border-sky-400/40 hover:bg-sky-400/15 hover:border-sky-400/60"
                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20",
              )}
            >
              {pkg.highlight && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-sky-400 text-[10px] font-bold text-slate-900 uppercase tracking-wide">
                  Best value
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-32 flex-shrink-0">
                  {Array.from({ length: Math.min(pkg.quantity, 5) }).map((_, i) => (
                    <FontAwesomeIcon
                      key={i}
                      icon={faSnowflake}
                      className={clsx("w-4 h-4", pkg.highlight ? "text-sky-400" : "text-slate-400")}
                    />
                  ))}
                  {pkg.quantity > 5 && (
                    <span className="text-xs text-slate-400 font-semibold self-center ml-0.5">
                      ×{pkg.quantity}
                    </span>
                  )}
                </div>
                <div>
                  <p className={clsx("text-sm font-semibold", pkg.highlight ? "text-sky-300" : "text-slate-200")}>
                    {pkg.label}
                  </p>
                  {pkg.savings && (
                    <p className="text-[11px] text-emerald-400 font-medium">{pkg.savings}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingQty === pkg.quantity ? (
                  <FontAwesomeIcon icon={faSpinnerThird} spin className="w-4 h-4 text-sky-400" />
                ) : (
                  <span className={clsx("text-sm font-bold", pkg.highlight ? "text-sky-300" : "text-slate-200")}>
                    {pkg.price}
                  </span>
                )}
              </div>
            </button>
          ))}
          <p className="text-[11px] text-slate-500 text-center mt-1">
            {isMas ? "Purchases handled securely by the App Store." : "Secure payment via Stripe."}
          </p>
        </div>
      )}

      {/* Phase: custom Stripe checkout */}
      {phase === "checkout" && clientSecret && selectedPkg && (
        <div className="px-6 pb-6">
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
          >
            <CheckoutForm
              clientSecret={clientSecret}
              price={selectedPkg.price}
              onSuccess={() => setPhase("success")}
              onError={(msg) => { setErrorMsg(msg); toast.error(msg); setPhase("error"); }}
            />
          </Elements>
        </div>
      )}

      {/* Phase: MAS in-progress */}
      {phase === "mas-purchasing" && (
        <div className="flex flex-col items-center gap-4 px-6 pb-8 text-center">
          <FontAwesomeIcon icon={faSpinnerThird} spin className="w-8 h-8 text-sky-400" />
          <div>
            <p className="text-sm font-semibold text-slate-100">Waiting for App Store…</p>
            <p className="text-xs text-slate-400 mt-1">Complete the purchase in the App Store prompt.</p>
          </div>
        </div>
      )}

      {/* Phase: success */}
      {phase === "success" && (
        <div className="flex flex-col items-center gap-4 px-6 pb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-400/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faCheckCircle} className="w-7 h-7 text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Freezes added!</p>
            <p className="text-xs text-slate-400 mt-1">Your streak freezes are ready to use.</p>
          </div>
          <button
            onClick={onClose}
            className="mt-1 px-5 py-2 rounded-lg bg-sky-400/10 border border-sky-400/30 text-sm font-semibold text-sky-400 hover:bg-sky-400/20 transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Phase: error */}
      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 px-6 pb-8 text-center">
          <p className="text-sm text-red-400">{errorMsg}</p>
          <button
            onClick={() => setPhase("pick")}
            className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
