"use client";
import { useEffect, useState } from "react";
import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Formik, Form, Field } from "formik";
import { useMas } from "@/lib/mas_hook";
import clsx from "clsx";
import { useSupabase } from "@/lib/supabase-provider";
import { useRefetchPlan } from "@/lib/plan_hook";
import { Tables } from "@/types/supabase";
import MfaSection from "@/components/MfaSection";
import Modal from "@/components/Modal";
import {
  StripeCheckout,
  STRIPE_LOOKUP_KEYS,
} from "@/components/Payment";

enum PlanType {
  FREE = "free",
  PREMIUM = "premium",
}

const features = {
  [PlanType.FREE]: ["Settings Sync", "Cloud Saves", "Leaderboard Access"],
  [PlanType.PREMIUM]: ["AI Tutor", "Progress Reports"],
};

const ACCOUNT_LINK =
  process.env["NEXT_PUBLIC_ACCOUNT_LINK"] ?? "https://touch-typer.kochie.io/account";

function openAccountLink() {
  if (ACCOUNT_LINK.startsWith("http")) {
    window.open(ACCOUNT_LINK, "_blank");
  }
}

function PremiumSubscriptionDetails({
  subscription,
  supabase,
  switchingInterval,
  setSwitchingInterval,
  portalLoading,
  setPortalLoading,
  onSubscriptionChange,
  isMas,
}: {
  subscription: Tables<"subscriptions">;
  supabase: ReturnType<typeof useSupabase>["supabase"];
  switchingInterval: string | null;
  setSwitchingInterval: (v: string | null) => void;
  portalLoading: boolean;
  setPortalLoading: (v: boolean) => void;
  onSubscriptionChange: () => Promise<void>;
  isMas: boolean;
}) {
  const isYearly = Boolean(
    subscription.billing_period &&
      (subscription.billing_period === "premium_yearly" ||
        subscription.billing_period === "yearly" ||
        String(subscription.billing_period).toLowerCase().includes("year"))
  );

  const handleSwitchInterval = async (interval: "monthly" | "yearly") => {
    if (subscription.billing_service !== "STRIPE" || !subscription.stripe_subscription_id) return;
    try {
      setSwitchingInterval(interval);
      const { error } = await supabase.functions.invoke("update-subscription-interval", {
        body: { interval },
      });
      if (error) throw error;
      await onSubscriptionChange();
    } catch (err) {
      console.error("Switch interval error:", err);
      alert(err instanceof Error ? err.message : "Could not change billing interval");
    } finally {
      setSwitchingInterval(null);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke("billing-portal");
      if (error) throw error;
      if (data?.url && typeof window !== "undefined") {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Billing portal error:", err);
      alert(err instanceof Error ? err.message : "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const isStripe = subscription.billing_service === "STRIPE";

  return (
    <div className="flex flex-col gap-4">
      {isStripe && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Billing cycle</span>
            <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 p-0.5">
              <button
                type="button"
                onClick={() => handleSwitchInterval("monthly")}
                disabled={!!switchingInterval}
                className={clsx(
                  "flex-1 min-w-0 rounded px-3 py-1.5 text-sm font-medium",
                  !isYearly
                    ? "bg-purple-600 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {switchingInterval === "monthly" ? (
                  <FontAwesomeIcon icon={faSpinner} spin size="sm" />
                ) : (
                  "Monthly"
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchInterval("yearly")}
                disabled={!!switchingInterval}
                className={clsx(
                  "flex-1 min-w-0 rounded px-3 py-1.5 text-sm font-medium",
                  isYearly
                    ? "bg-purple-600 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {switchingInterval === "yearly" ? (
                  <FontAwesomeIcon icon={faSpinner} spin size="sm" />
                ) : (
                  "Yearly"
                )}
              </button>
            </div>
          </div>
          {subscription.next_billing_date && (
            <p className="text-sm text-gray-600">
              Next payment:{" "}
              {new Date(subscription.next_billing_date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          {subscription.auto_renew === false && (
            <p className="text-sm text-amber-600">Auto-renewal is off</p>
          )}
        </>
      )}
      <button
        onClick={isStripe ? handleOpenBillingPortal : openAccountLink}
        disabled={portalLoading && isStripe}
        type="button"
        className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
      >
        {portalLoading ? (
          <FontAwesomeIcon icon={faSpinner} spin size="sm" />
        ) : (
          isStripe ? "Manage subscription" : "Manage on Web"
        )}
      </button>
      {!isStripe && isMas && (
        <p className="text-xs text-gray-500 max-w-[200px]">
          Cancel or update payment in App Store settings.
        </p>
      )}
    </div>
  );
}

export default function Account({ onError, onCancel, onChangePassword }) {
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [switchingInterval, setSwitchingInterval] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const isMas = useMas();
  const [attributes, setAttributes] = useState({
    email: "",
    phone_number: "",
    name: "",
    preferred_username: "",
  });
  const [subscription, setSubscription] = useState<Tables<"subscriptions"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeLookupKey, setStripeLookupKey] = useState<string>(STRIPE_LOOKUP_KEYS.monthly);
  const [iapProducts, setIapProducts] = useState<Electron.Product[]>([]);
  const [iapLoading, setIapLoading] = useState(false);
  const [iapPurchasing, setIapPurchasing] = useState<string | null>(null);

  const { supabase, user } = useSupabase();
  const refetchPlan = useRefetchPlan();

  const handleSignOut = async () => {
    setSubmitting(true);
    await supabase.auth.signOut();
    onError();
    setSubmitting(false);
  };

  const fetchIapProducts = async () => {
    if (typeof window === "undefined" || !window.electronAPI?.getProducts) return;
    setIapLoading(true);
    try {
      const products = await window.electronAPI.getProducts();
      setIapProducts(products ?? []);
    } catch (err) {
      console.error("Failed to fetch IAP products:", err);
    } finally {
      setIapLoading(false);
    }
  };

  const handleIapPurchase = async (productId: string) => {
    if (!window.electronAPI?.purchaseProduct) return;
    setIapPurchasing(productId);
    try {
      await window.electronAPI.purchaseProduct(productId, 1);
      await refetchPlan();
      await fetchUserData();
    } catch (err) {
      console.error("IAP purchase failed:", err);
    } finally {
      setIapPurchasing(null);
    }
  };

  const deleteAccount = async () => {
    setDeleteSubmitting(true);

    if (
      confirm(
        "For real, this will delete your account and all data associated with it. Are you sure?",
      )
    ) {
      // Note: Deleting a user in Supabase typically requires a server-side function
      // or admin API. For now, we'll sign them out.
      // You may want to create an Edge Function for actual account deletion.
      try {
        // Call an Edge Function to delete the user
        const { error } = await supabase.functions.invoke('delete-user');
        if (error) throw error;
        await supabase.auth.signOut();
        onError();
      } catch (err: any) {
        console.error("Error deleting account:", err);
        alert("Failed to delete account. Please contact support.");
      }
    }
    setDeleteSubmitting(false);
  };

  const fetchUserData = async () => {
    if (!user) {
      onError();
      return;
    }

    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profile) {
        setAttributes({
          email: user.email || "",
          phone_number: profile.phone_number || "",
          name: profile.name || "",
          preferred_username: profile.preferred_username || "",
        });
      } else {
        setAttributes({
          email: user.email || "",
          phone_number: user.user_metadata?.phone_number || "",
          name: user.user_metadata?.name || "",
          preferred_username: "",
        });
      }

      // Get subscription
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      setSubscription(sub);
    } catch (err: any) {
      console.error("Error fetching user data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user === null) {
      onError();
      return;
    }

    fetchUserData();
  }, [user]);

  // Realtime subscription for subscription changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`subscriptions:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setSubscription(null);
            refetchPlan();
          } else if (payload.new) {
            setSubscription(payload.new as Tables<"subscriptions">);
            refetchPlan();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, refetchPlan]);

  useEffect(() => {
    if (isMas && subscription?.billing_plan === "free") {
      fetchIapProducts();
    }
  }, [isMas, subscription?.billing_plan]);

  const handleStripeComplete = async () => {
    await refetchPlan();
    await fetchUserData();
    setShowStripeCheckout(false);
  };

  return (
    <div className="h-full">
      <div className="flex max-w-7xl">
        <div className="flex flex-1 flex-col mx-8 my-12">
          <div className="mx-auto w-full">
            <div>
              <h2 className="text-2xl font-bold leading-9 tracking-tight text-gray-900">
                Account Details
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Change details associated with your account.
              </p>

              <Formik
                enableReinitialize={true}
                initialValues={{
                  email: attributes.email,
                  phone: attributes.phone_number,
                  name: attributes.name,
                  username: attributes.preferred_username,
                }}
                onSubmit={async (values, { setSubmitting }) => {
                  try {
                    // Update profile in database
                    const { error: profileError } = await supabase
                      .from('profiles')
                      .upsert({
                        id: user!.id,
                        email: values.email,
                        name: values.name,
                        phone_number: values.phone,
                        preferred_username: values.username,
                      });

                    if (profileError) throw profileError;

                    // Update email if changed
                    if (values.email !== user?.email) {
                      const { error: emailError } = await supabase.auth.updateUser({
                        email: values.email,
                      });
                      if (emailError) throw emailError;
                    }

                    // Update user metadata
                    const { error: metaError } = await supabase.auth.updateUser({
                      data: {
                        name: values.name,
                        phone_number: values.phone,
                      },
                    });

                    if (metaError) throw metaError;
                  } catch (err: any) {
                    console.error("Error updating profile:", err);
                    alert(`Failed to update profile: ${err.message}`);
                  }

                  setSubmitting(false);
                }}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="mt-5 grid grid-cols-6 gap-3">
                      <div className="col-span-3">
                        <label
                          htmlFor="username"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Username
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                            <Field
                              type="text"
                              name="username"
                              id="username"
                              autoComplete="username"
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Name
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                            <Field
                              type="text"
                              name="name"
                              id="name"
                              autoComplete="name"
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Email
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                            <Field
                              type="email"
                              name="email"
                              id="email"
                              autoComplete="email"
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium leading-6 text-gray-900"
                        >
                          Phone Number
                        </label>
                        <div className="mt-2">
                          <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                            <Field
                              type="text"
                              name="phone"
                              id="phone"
                              autoComplete="phone_number"
                              className="block flex-1 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                              placeholder=""
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-x-6">
                      <div className="gap-6 flex">
                        <button
                          onClick={handleSignOut}
                          disabled={submitting}
                          type="button"
                          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                        >
                          {!submitting ? (
                            "Sign Out"
                          ) : (
                            <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={onChangePassword}
                          className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                        >
                          Change Password
                        </button>
                      </div>

                      <div className="w-min gap-6 flex">
                        <button
                          type="button"
                          onClick={onCancel}
                          className="text-sm font-semibold leading-6 text-gray-900"
                        >
                          Cancel
                        </button>
                        <Button type="submit" disabled={isSubmitting}>
                          {!isSubmitting ? (
                            "Update"
                          ) : (
                            <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Form>
                )}
              </Formik>

              <div>
                <div className="border-b border-gray-900/10 my-6" />

                <h2 className="text-base font-semibold leading-7 text-gray-900">
                  Account Features
                </h2>

                <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-12">
                  <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Control what features are available to you.
                    </p>

                    {error && (
                      <div className="text-black">
                        <p>There was an error checking your subscription</p>
                      </div>
                    )}

                    {loading || !subscription ? (
                      <p className="text-black">Loading...</p>
                    ) : (
                      <div className="mt-auto pt-4">
                        <p className="text-gray-600 text-sm leading-6">
                          <span>You're currently on the</span>
                          <span className="mx-1 inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            {subscription.billing_plan}
                          </span>
                          <span>plan.</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {features[subscription.billing_plan as PlanType]?.map(
                            (feature) => (
                              <span
                                key={feature}
                                className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                              >
                                {feature}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap sm:flex-col sm:shrink-0">
                    {subscription?.billing_plan === "free" && !isMas && !showStripeCheckout && (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setShowStripeCheckout(true);
                          }}
                          type="button"
                          className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                        >
                          Upgrade to Premium
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            openAccountLink();
                          }}
                          type="button"
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                          Manage on Web
                        </button>
                      </>
                    )}
                    {subscription?.billing_plan === "free" && isMas && (
                      <>
                        {iapLoading ? (
                          <span className="text-sm text-gray-500">Loading plans…</span>
                        ) : (
                          iapProducts.map((product) => (
                            <button
                              key={product.productIdentifier}
                              onClick={(e) => {
                                e.preventDefault();
                                handleIapPurchase(product.productIdentifier);
                              }}
                              type="button"
                              disabled={iapPurchasing !== null}
                              className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:opacity-70"
                            >
                              {iapPurchasing === product.productIdentifier ? (
                                <FontAwesomeIcon icon={faSpinner} spin size="sm" className="mr-1" />
                              ) : null}
                              {product.localizedTitle} – {product.formattedPrice}
                            </button>
                          ))
                        )}
                        {!iapLoading && iapProducts.length === 0 && (
                          <span className="text-sm text-gray-500">No plans available</span>
                        )}
                      </>
                    )}
                    {subscription?.billing_plan === "premium" && !isMas && (
                      <PremiumSubscriptionDetails
                        subscription={subscription}
                        supabase={supabase}
                        switchingInterval={switchingInterval}
                        setSwitchingInterval={setSwitchingInterval}
                        portalLoading={portalLoading}
                        setPortalLoading={setPortalLoading}
                        onSubscriptionChange={async () => {
                          await refetchPlan();
                          await fetchUserData();
                        }}
                        isMas={isMas}
                      />
                    )}
                    {subscription?.billing_plan === "premium" && isMas && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openAccountLink();
                        }}
                        type="button"
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        Manage Subscription
                      </button>
                    )}
                  </div>
                </div>


                {showStripeCheckout && !isMas && (
                  <Modal
                    open={showStripeCheckout}
                    onClose={() => setShowStripeCheckout(false)}
                    className="w-full max-w-2xl"
                  >
                    <div className="p-4">
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setStripeLookupKey(STRIPE_LOOKUP_KEYS.monthly)}
                          className={clsx(
                            "rounded px-3 py-1 text-sm font-medium",
                            stripeLookupKey === STRIPE_LOOKUP_KEYS.monthly
                              ? "bg-purple-600 text-white"
                              : "bg-white border border-gray-300 text-gray-700"
                          )}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setStripeLookupKey(STRIPE_LOOKUP_KEYS.yearly)}
                          className={clsx(
                            "rounded px-3 py-1 text-sm font-medium",
                            stripeLookupKey === STRIPE_LOOKUP_KEYS.yearly
                              ? "bg-purple-600 text-white"
                              : "bg-white border border-gray-300 text-gray-700"
                          )}
                        >
                          Yearly
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowStripeCheckout(false)}
                          className="rounded px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                      <div key={stripeLookupKey}>
                        <StripeCheckout
                          lookupKey={stripeLookupKey}
                          onComplete={handleStripeComplete}
                        />
                      </div>
                    </div>
                  </Modal>
                )}
              </div>

              <div className="border-b border-gray-900/10 my-6" />

              <MfaSection />

              <div className="border-b border-gray-900/10 my-6" />

              <div>
                <h2 className="text-base font-semibold leading-7 text-gray-900">
                  Danger Zone
                </h2>

                <div className="flex gap-12">
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Permanently delete your acccount and all information
                    associated with it.
                  </p>
                  <button
                    onClick={deleteAccount}
                    type="button"
                    disabled={deleteSubmitting}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  >
                    {!deleteSubmitting ? (
                      "Delete Account"
                    ) : (
                      <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
