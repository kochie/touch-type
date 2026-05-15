"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSparkles,
  faSpinnerThird,
  faCheckCircle,
  faMicrochipAi,
  faChartLine,
  faCalendarCheck,
} from "@fortawesome/pro-duotone-svg-icons";
import { faXmark, faChevronLeft, faCheck } from "@fortawesome/pro-regular-svg-icons";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import type { Appearance } from "@stripe/stripe-js";
import clsx from "clsx";
import { useSupabase, useSupabaseClient } from "@/lib/supabase-provider";
import { useMas } from "@/lib/mas_hook";
import { metrics } from "@/lib/metrics";
import { stripePromise } from "@/components/Payment";

interface Plan {
  id: "monthly" | "yearly";
  lookupKey: string;
  /** Apple App Store product identifier — same suffix as lookupKey. */
  masProductId: string;
  title: string;
  price: string;
  perMonth: string;
  badge?: string;
  trial?: string;
  savings?: string;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "monthly",
    lookupKey: "premium_monthly",
    masProductId: "premium_monthly",
    title: "Monthly",
    price: "$2.99 USD",
    perMonth: "$2.99 USD/month",
  },
  {
    id: "yearly",
    lookupKey: "premium_yearly",
    masProductId: "premium_yearly",
    title: "Yearly",
    price: "$28.70 USD/year",
    perMonth: "$2.39 USD/month",
    badge: "Best Value",
    trial: "First 7 days free",
    savings: "Save 20%",
    highlight: true,
  },
];

const MANAGE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const TERMS_URL = "https://touch-typer.kochie.io/terms";
const PRIVACY_URL = "https://touch-typer.kochie.io/privacy";

const FEATURES = [
  { icon: faMicrochipAi, label: "AI Typing Coach" },
  { icon: faChartLine, label: "Progress Reports" },
  { icon: faSparkles, label: "Priority Support" },
];

const STRIPE_APPEARANCE: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#a78bfa",
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
    ".Input:focus": { border: "1px solid #a78bfa", boxShadow: "0 0 0 1px #a78bfa" },
    ".Label": { color: "#94a3b8", fontWeight: "500" },
    ".Tab": { border: "1px solid rgba(255,255,255,0.08)" },
    ".Tab--selected": { border: "1px solid #a78bfa", color: "#a78bfa" },
  },
};

function SubscriptionCheckoutForm({
  sessionId,
  plan,
  email,
  onSuccess,
  onError,
}: {
  sessionId: string;
  plan: Plan;
  email: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const result = useCheckoutElements();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (result.type !== "success") return;
    setLoading(true);
    try {
      if (email) await result.checkout.updateEmail(email);
      const confirmResult = await result.checkout.confirm({
        redirect: "if_required",
      });
      if (confirmResult.type === "error") throw new Error(confirmResult.error?.message ?? "Payment failed");

      // Non-redirect success: finalize via POST
      const { error: fnError } = await supabase.functions.invoke(
        "finalize-checkout-session",
        { body: { sessionId } },
      );
      if (fnError) {
        const body = await (fnError as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? "Subscription could not be activated. Contact support.");
      }
      metrics.count("checkout.completed", 1, { plan: plan.id });
      onSuccess();
    } catch (err: any) {
      metrics.count("checkout.failed", 1, { plan: plan.id });
      onError(err?.message ?? "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isReady = result.type === "success";
  const buttonLabel = plan.trial
    ? `Start free trial`
    : `Subscribe for ${plan.perMonth}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
      <PaymentElement
        options={{ layout: "tabs" }}
        onLoadError={(e) => onError(e.error?.message ?? "Payment form failed to load.")}
      />
      <button
        type="submit"
        disabled={!isReady || loading}
        className="w-full py-2.5 rounded-lg bg-violet-500 text-white text-sm font-bold hover:bg-violet-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <FontAwesomeIcon icon={faSpinnerThird} spin className="w-4 h-4" />
            Processing…
          </>
        ) : (
          buttonLabel
        )}
      </button>
      {plan.trial && (
        <p className="text-[11px] text-slate-500 text-center -mt-1">
          Then {plan.perMonth}. Cancel anytime.
        </p>
      )}
    </form>
  );
}

type Phase = "loading" | "pick" | "checkout" | "mas-purchasing" | "switching" | "switch_success" | "success" | "error";

export default function PremiumPurchaseModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [restoring, setRestoring] = useState(false);
  const { supabase } = useSupabase();
  const isMas = useMas();

  // Fetch subscription to determine if user is already premium
  useEffect(() => {
    const fetchSub = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPhase("pick"); return; }
      setUserEmail(user.email ?? "");
      const { data } = await supabase
        .from("subscriptions")
        .select("billing_plan,billing_period,stripe_subscription_id")
        .eq("user_id", user.id)
        .single();
      if (data?.billing_plan === "premium" && data?.stripe_subscription_id) {
        const id = data.billing_period === "premium_yearly" ? "yearly"
          : data.billing_period === "premium_monthly" ? "monthly"
          : null;
        setCurrentPlanId(id);
      }
      setPhase("pick");
    };
    fetchSub();
  }, []);

  // 3DS redirect fallback: Electron intercepts the Stripe redirect and notifies us
  useEffect(() => {
    window.electronAPI?.onSubscriptionPurchaseComplete?.(() => setPhase("success"));
  }, []);

  // MAS purchase completion: fired by IapBridge once map-transaction has
  // registered the StoreKit transaction server-side. The subscription row
  // may take a moment to populate (Apple's webhook upserts it), but the
  // purchase itself has succeeded by this point.
  useEffect(() => {
    const onIap = () => setPhase("success");
    window.addEventListener("touchtyper:iap-subscription-purchased", onIap);
    return () => window.removeEventListener("touchtyper:iap-subscription-purchased", onIap);
  }, []);

  const isPremium = currentPlanId !== null;

  const handleSwitchPlan = async (plan: Plan) => {
    setLoadingPlan(plan.id);
    setErrorMsg(null);
    setPhase("switching");
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription-interval", {
        body: { interval: plan.id },
      });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      const formatted = data?.next_billing_date
        ? new Date(data.next_billing_date).toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric",
          })
        : null;
      setNextBillingDate(formatted);
      setSelectedPlan(plan);
      metrics.count("subscription.switched", 1, { from: currentPlanId ?? "unknown", to: plan.id });
      setPhase("switch_success");
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      metrics.count("subscription.switch_failed", 1, { plan: plan.id });
      setErrorMsg(msg);
      toast.error(msg);
      setPhase("error");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (isPremium) {
      if (plan.id === currentPlanId) return; // already on this plan
      return handleSwitchPlan(plan);
    }
    setLoadingPlan(plan.id);
    setErrorMsg(null);

    // MAS path: hand control to StoreKit. IapBridge will pick up the
    // resulting transaction and dispatch touchtyper:iap-subscription-
    // purchased once registered server-side; the listener above flips us
    // into the success phase.
    if (isMas) {
      try {
        const result = await window.electronAPI?.purchaseSubscription?.(plan.masProductId);
        if (!result?.queued) {
          throw new Error(result?.error ?? "Purchase could not be initiated.");
        }
        setSelectedPlan(plan);
        metrics.count("checkout.initiated", 1, { plan: plan.id, surface: "mas" });
        setPhase("mas-purchasing");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        metrics.count("checkout.failed", 1, { plan: plan.id, surface: "mas" });
        setErrorMsg(msg);
        toast.error(msg);
        setPhase("error");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { lookup_key: plan.lookupKey },
      });
      if (error) {
        const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      if (!data?.clientSecret || !data?.sessionId) {
        throw new Error("Checkout session could not be created. Please try again.");
      }
      setClientSecret(data.clientSecret);
      setSessionId(data.sessionId);
      setSelectedPlan(plan);
      metrics.count("checkout.initiated", 1, { plan: plan.id, surface: "stripe" });
      setPhase("checkout");
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      metrics.count("checkout.failed", 1, { plan: plan.id, surface: "stripe" });
      setErrorMsg(msg);
      toast.error(msg);
      setPhase("error");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    setErrorMsg(null);
    try {
      const result = await window.electronAPI?.restorePurchases?.();
      if (!result?.restored) {
        throw new Error(result?.error ?? "Restore could not be initiated.");
      }
      // StoreKit will replay transactions via IapBridge. We don't know how
      // many will arrive; the bridge's per-transaction event will flip the
      // modal to success if any was a subscription. After ~5s with no
      // event, give up and tell the user.
      setTimeout(() => {
        setRestoring(false);
        toast.success("Restore complete. If you had an active subscription it should now be reflected.");
      }, 5000);
      metrics.count("iap.restore.invoked");
    } catch (err: unknown) {
      setRestoring(false);
      const msg = err instanceof Error ? err.message : "Restore failed.";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          {phase === "checkout" && (
            <button
              onClick={() => { setPhase("pick"); setClientSecret(null); setSelectedPlan(null); }}
              className="text-slate-400 hover:text-slate-200 transition-colors mr-1"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faSparkles} className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-100">
              {isPremium ? "Manage Plan" : "Go Premium"}
            </p>
            <p className="text-xs text-slate-400">
              {isPremium ? "Switch between monthly and yearly" : "Unlock your full potential"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      </div>

      {/* Phase: loading */}
      {phase === "loading" && (
        <div className="flex items-center justify-center px-6 pb-8">
          <FontAwesomeIcon icon={faSpinnerThird} spin className="w-5 h-5 text-violet-400" />
        </div>
      )}

      {/* Phase: switching (loading while changing plan) */}
      {phase === "switching" && (
        <div className="flex flex-col items-center gap-3 px-6 pb-8">
          <FontAwesomeIcon icon={faSpinnerThird} spin className="w-5 h-5 text-violet-400" />
          <p className="text-xs text-slate-400">Updating your plan…</p>
        </div>
      )}

      {/* Phase: plan picker */}
      {phase === "pick" && (
        <div className="flex flex-col gap-3 px-6 pb-6">
          {/* Feature highlights (only for new subscribers) */}
          {!isPremium && (
            <div className="flex items-center justify-center gap-4 py-2 mb-1">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <FontAwesomeIcon icon={f.icon} className="w-3.5 h-3.5 text-violet-400" />
                  {f.label}
                </div>
              ))}
            </div>
          )}

          {PLANS.map((plan) => {
            const isCurrent = isPremium && plan.id === currentPlanId;
            const isDisabled = loadingPlan !== null || isCurrent;
            return (
              <button
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                disabled={isDisabled}
                className={clsx(
                  "relative flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-150",
                  isCurrent
                    ? "bg-violet-500/15 border-violet-500/60 cursor-default"
                    : "disabled:opacity-60 disabled:cursor-not-allowed",
                  !isCurrent && plan.highlight
                    ? "bg-violet-500/10 border-violet-500/40 hover:bg-violet-500/15 hover:border-violet-500/60"
                    : !isCurrent
                    ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                    : "",
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white uppercase tracking-wide">
                    Current
                  </span>
                )}
                {!isCurrent && plan.badge && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-violet-500 text-[10px] font-bold text-white uppercase tracking-wide">
                    {plan.badge}
                  </span>
                )}
                <div className="flex flex-col gap-0.5">
                  <p className={clsx("text-sm font-semibold", isCurrent ? "text-emerald-300" : plan.highlight ? "text-violet-300" : "text-slate-200")}>
                    {plan.title}
                  </p>
                  {!isPremium && plan.trial && (
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5 text-emerald-400" />
                      <p className="text-[11px] text-emerald-400 font-medium">{plan.trial}</p>
                    </div>
                  )}
                  {!isPremium && plan.savings && (
                    <p className="text-[11px] text-violet-400 font-medium">{plan.savings}</p>
                  )}
                  {isPremium && !isCurrent && (
                    <p className="text-[11px] text-violet-400 font-medium">Switch to this plan</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {loadingPlan === plan.id ? (
                    <FontAwesomeIcon icon={faSpinnerThird} spin className="w-4 h-4 text-violet-400" />
                  ) : (
                    <>
                      <span className={clsx("text-sm font-bold", isCurrent ? "text-emerald-300" : plan.highlight ? "text-violet-300" : "text-slate-200")}>
                        {plan.perMonth}
                      </span>
                      {plan.id === "yearly" && (
                        <span className="text-[11px] text-slate-500">{plan.price}</span>
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })}

          {isMas ? (
            <div className="mt-2 flex flex-col gap-2 text-[11px] text-slate-500 text-center">
              <p>
                {isPremium
                  ? "Plan changes are managed in App Store settings on this Apple ID."
                  : "Subscriptions auto-renew unless cancelled at least 24 hours before the current period ends. Manage or cancel anytime in App Store settings."}
                {" "}All prices in USD.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRestorePurchases}
                  disabled={restoring}
                  className="text-[11px] font-medium text-violet-400 hover:text-violet-300 disabled:text-slate-500"
                >
                  {restoring ? "Restoring…" : "Restore Purchases"}
                </button>
                <span aria-hidden className="text-slate-700">·</span>
                <a
                  href={MANAGE_SUBSCRIPTIONS_URL}
                  onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.(MANAGE_SUBSCRIPTIONS_URL); }}
                  className="text-[11px] font-medium text-violet-400 hover:text-violet-300"
                >
                  Manage in App Store
                </a>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600">
                <a
                  href={TERMS_URL}
                  onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.(TERMS_URL); }}
                  className="hover:text-slate-400"
                >
                  Terms of Use
                </a>
                <span aria-hidden>·</span>
                <a
                  href={PRIVACY_URL}
                  onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.(PRIVACY_URL); }}
                  className="hover:text-slate-400"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 text-center mt-1">
              {isPremium ? "Changes take effect at the next billing cycle." : "Secure payment via Stripe. Cancel anytime."}
              {" "}All prices in USD.
            </p>
          )}
        </div>
      )}

      {/* Phase: MAS purchasing — StoreKit has the dialog up */}
      {phase === "mas-purchasing" && selectedPlan && (
        <div className="px-6 pb-6 flex flex-col items-center gap-4 py-6">
          <FontAwesomeIcon icon={faSpinnerThird} spin className="w-8 h-8 text-violet-400" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200">Confirm in the App Store dialog</p>
            <p className="text-xs text-slate-500 mt-1">{selectedPlan.title} · {selectedPlan.perMonth}</p>
          </div>
        </div>
      )}

      {/* Phase: checkout (new subscribers only) */}
      {phase === "checkout" && clientSecret && sessionId && selectedPlan && (
        <div className="px-6 pb-6">
          <CheckoutElementsProvider
            stripe={stripePromise}
            options={{
              clientSecret,
              elementsOptions: { appearance: STRIPE_APPEARANCE },
            }}
          >
            <SubscriptionCheckoutForm
              sessionId={sessionId}
              plan={selectedPlan}
              email={userEmail}
              onSuccess={() => setPhase("success")}
              onError={(msg) => { setErrorMsg(msg); toast.error(msg); setPhase("error"); }}
            />
          </CheckoutElementsProvider>
        </div>
      )}

      {/* Phase: switch_success */}
      {phase === "switch_success" && selectedPlan && (
        <div className="flex flex-col items-center gap-4 px-6 pb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faCalendarCheck} className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Switched to {selectedPlan.title}!
            </p>
            {nextBillingDate && (
              <p className="text-xs text-slate-400 mt-1">
                Your new plan starts on {nextBillingDate}.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="mt-1 px-5 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-sm font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Phase: success (new subscription) */}
      {phase === "success" && (
        <div className="flex flex-col items-center gap-4 px-6 pb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faCheckCircle} className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Welcome to Premium!</p>
            <p className="text-xs text-slate-400 mt-1">All features are now unlocked.</p>
          </div>
          <button
            onClick={onClose}
            className="mt-1 px-5 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-sm font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors"
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
