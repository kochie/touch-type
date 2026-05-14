"use client";
import { useEffect, useState } from "react";
import Button from "../Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Formik, Form, Field } from "formik";
import { faArrowsRotate } from "@fortawesome/pro-duotone-svg-icons";
import { useMas } from "@/lib/mas_hook";
import clsx from "clsx";
import { useSupabase } from "@/lib/supabase-provider";
import { Tables } from "@/types/supabase";
import { ModalType, useModal } from "@/lib/modal-provider";
import { toast } from "sonner";
import { friendlyAuthError } from "@/lib/auth-errors";

enum PlanType {
  FREE = "free",
  PREMIUM = "premium",
}

const features = {
  [PlanType.FREE]: ["Settings Sync", "Cloud Saves", "Leaderboard Access"],
  [PlanType.PREMIUM]: ["AI Tutor", "Progress Reports"],
};

export default function Account({ onError, onCancel, onChangePassword }) {
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
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
  
  const { supabase, user } = useSupabase();
  const { setModal } = useModal();

  const handleSignOut = async () => {
    setSubmitting(true);
    await supabase.auth.signOut();
    onError();
    setSubmitting(false);
  };

  const handleProduct = async () => {
    const products =
      // @ts-expect-error electronAPI is not defined
      (await window.electronAPI.getProducts()) as Electron.Product[];
    console.log("products", products);
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
        toast.error("Failed to delete account. Please contact support.");
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
        .select('billing_plan, billing_period, next_billing_date, status, auto_renew, stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }

      setSubscription(sub as unknown as Tables<"subscriptions">);
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

  const refetch = async () => {
    setReloading(true);
    await fetchUserData();
    setReloading(false);
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription || togglingAutoRenew) return;
    const newValue = !subscription.auto_renew;
    setTogglingAutoRenew(true);
    try {
      const { data, error } = await supabase.functions.invoke('toggle-auto-renew', {
        body: { auto_renew: newValue },
      });
      if (error) {
        const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      setSubscription((prev) => prev ? { ...prev, auto_renew: data.auto_renew } : prev);
      toast.success(data.auto_renew ? 'Auto-renew enabled.' : 'Auto-renew disabled. Your plan will expire at the end of the billing period.');
    } catch (err: unknown) {
      // Drop stale optimistic state — Stripe may have failed mid-toggle.
      await fetchUserData();
      toast.error(friendlyAuthError(err, 'Failed to update auto-renew setting.'));
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  return (
    <div className="h-full">
      <div className="flex min-h-full max-h-[80vh] max-w-7xl">
        <div className="flex flex-1 flex-col justify-center mx-8 my-12">
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
                    toast.success(values.email !== user?.email ? "Profile updated. Check your email to confirm the address change." : "Profile updated.");
                  } catch (err: any) {
                    console.error("Error updating profile:", err);
                    toast.error(`Failed to update profile: ${err.message}`);
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

              <div className={clsx(isMas && "hidden")}>
                <div className="border-b border-gray-900/10 my-6" />

                <h2 className="text-base font-semibold leading-7 text-gray-900">
                  Account Features
                </h2>

                {/* Top row: description + action buttons */}
                <div className="flex items-start justify-between gap-4 mt-1">
                  <div>
                    <p className="text-sm leading-6 text-gray-600">
                      Control what features are available to you.
                    </p>
                    {!loading && subscription && (
                      <p className="text-gray-600 text-sm leading-6">
                        <span>You're currently on the</span>
                        <span className={`mx-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${subscription.billing_plan === "premium" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"}`}>
                          {subscription.billing_plan}
                        </span>
                        <span>plan.</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="text-black"
                      onClick={(event) => { event.preventDefault(); refetch(); }}
                    >
                      <FontAwesomeIcon icon={faArrowsRotate} spin={reloading} size="lg" />
                    </button>
                    <button
                      onClick={(event) => { event.preventDefault(); setModal(ModalType.PREMIUM_PURCHASE); }}
                      type="button"
                      disabled={deleteSubmitting}
                      className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                    >
                      {subscription?.billing_plan === "premium" ? "Manage Plan" : "Upgrade to Premium"}
                    </button>
                  </div>
                </div>

                {/* Full-width billing details + feature chips */}
                {error && <p className="text-sm text-red-500 mt-2">There was an error checking your subscription.</p>}
                {loading || !subscription ? (
                  <p className="text-black mt-2">Loading...</p>
                ) : (
                  <>
                    {subscription.billing_plan === "premium" && (
                      <div className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-1.5 text-sm">
                        {subscription.billing_period && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Billing period</span>
                            <span className="text-gray-700 font-medium">
                              {subscription.billing_period === "premium_monthly" ? "Monthly ($2.99 USD/mo)" : "Yearly ($2.39 USD/mo)"}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">{subscription.auto_renew === false ? "Expires on" : "Renews on"}</span>
                          <span className="text-gray-700 font-medium">
                            {subscription.next_billing_date
                              ? new Date(subscription.next_billing_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                              : "—"}
                          </span>
                        </div>
                        {subscription.status && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={`font-medium capitalize ${subscription.status === "active" ? "text-emerald-600" : subscription.status === "trialing" ? "text-sky-600" : subscription.status === "cancelled" || subscription.status === "canceled" ? "text-red-500" : "text-amber-500"}`}>
                              {(() => {
                                if (subscription.status === "trialing" && subscription.next_billing_date) {
                                  try {
                                    const end = Temporal.Instant.from(subscription.next_billing_date).toZonedDateTimeISO(Temporal.Now.timeZoneId()).toPlainDate();
                                    const days = Temporal.Now.plainDateISO().until(end, { largestUnit: "days" }).days;
                                    return days > 0 ? `Trialing (${days} day${days === 1 ? "" : "s"} left)` : "Trialing (ends today)";
                                  } catch {
                                    return "Trialing";
                                  }
                                }
                                return subscription.status.replace("_", " ");
                              })()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Auto-renew</span>
                          <button
                            onClick={handleToggleAutoRenew}
                            disabled={togglingAutoRenew}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${subscription.auto_renew ? "bg-emerald-500" : "bg-gray-300"}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${subscription.auto_renew ? "translate-x-4" : "translate-x-0"}`} />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1 mt-3">
                      {features[subscription.billing_plan as PlanType]?.map((feature) => (
                        <span key={feature} className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

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
