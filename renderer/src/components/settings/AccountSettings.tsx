"use client";

import { useState, useEffect, useRef } from "react";
import { Field, Label, Description } from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";
import { useSupabase } from "@/lib/supabase-provider";
import { useMas } from "@/lib/mas_hook";
import { useModal, ModalType } from "@/lib/modal-provider";
import { metrics } from "@/lib/metrics";
import Button from "../Button";
import { toast } from "sonner";

interface Subscription {
  billing_plan: string | null;
  billing_period: string | null;
  next_billing_date: string | null;
  status: string | null;
  auto_renew: boolean | null;
}

function InputField({
  id,
  label,
  description,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <Field as="div" className="flex items-start justify-between gap-4">
      <span className="flex flex-grow flex-col pt-1.5">
        <Label className="text-sm font-medium text-white">{label}</Label>
        {description && (
          <Description className="text-sm text-gray-500">{description}</Description>
        )}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={clsx(
          "w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-gray-600",
          "focus:outline-none focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50",
          "transition-colors duration-150",
          readOnly && "opacity-50 cursor-not-allowed",
        )}
      />
    </Field>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass ?? "text-gray-300"}>{value}</span>
    </div>
  );
}

function statusStyle(status: string | null) {
  switch (status) {
    case "active": return "text-emerald-400";
    case "trialing": return "text-sky-400";
    case "cancelled": case "canceled": return "text-red-400";
    case "past_due": return "text-amber-400";
    default: return "text-gray-400";
  }
}

function formatPeriod(period: string | null) {
  if (period === "premium_monthly") return "Monthly ($2.99/mo)";
  if (period === "premium_yearly") return "Yearly ($2.39/mo)";
  return "—";
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return Temporal.Instant.from(iso)
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDate()
    .toLocaleString(undefined, {
      year: "numeric", month: "long", day: "numeric",
    });
}

export function AccountSettings() {
  const { supabase, user } = useSupabase();
  const isMas = useMas();
  const { setModal, modal } = useModal();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);

  const fetchSubscription = async () => {
    if (!user) return;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("billing_plan, billing_period, next_billing_date, status, auto_renew")
      .eq("user_id", user.id)
      .single();
    setSubscription(sub ?? { billing_plan: "free", billing_period: null, next_billing_date: null, status: null, auto_renew: null });
    setLoadingPlan(false);
  };

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, preferred_username")
        .eq("id", user.id)
        .single();
      setName(profile?.name ?? user.user_metadata?.name ?? "");
      setUsername(profile?.preferred_username ?? "");
      await fetchSubscription();
    };
    fetchProfile();
  }, [user, supabase]);

  // Re-fetch when the premium purchase modal closes
  const prevModal = useRef(modal);
  useEffect(() => {
    if (prevModal.current === ModalType.PREMIUM_PURCHASE && modal === ModalType.NONE) {
      fetchSubscription();
    }
    prevModal.current = modal;
  }, [modal]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name,
        preferred_username: username.trim(),
      });
      if (error) {
        if (error.code === "23505") throw new Error("That username is already taken.");
        throw error;
      }
      await supabase.auth.updateUser({ data: { name } });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
      setSaveStatus("error");
      setTimeout(() => { setSaveStatus("idle"); setSaveError(null); }, 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    metrics.count("auth.signout");
    setSigningOut(false);
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription || togglingAutoRenew) return;
    const newValue = !subscription.auto_renew;
    setTogglingAutoRenew(true);
    try {
      const { data, error } = await supabase.functions.invoke("toggle-auto-renew", {
        body: { auto_renew: newValue },
      });
      if (error) {
        const body = await (error as any).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      setSubscription((prev) => prev ? { ...prev, auto_renew: data.auto_renew } : prev);
      toast.success(data.auto_renew ? "Auto-renew enabled." : "Auto-renew disabled. Your plan will expire at the end of the billing period.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update auto-renew setting.");
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("This will permanently delete your account and all associated data. Are you sure?")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user");
      if (error) throw error;
      metrics.count("auth.account_deleted");
      await supabase.auth.signOut();
    } catch {
      toast.error("Failed to delete account. Please contact support.");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  const isPremium = subscription?.billing_plan === "premium";
  const nextDate = formatDate(subscription?.next_billing_date ?? null);

  return (
    <div className="flex flex-col gap-6">

      {/* Profile */}
      <div className="flex flex-col gap-4">
        <InputField id="email" label="Email" description="Your sign-in email address." value={user.email ?? ""} readOnly />
        <InputField id="name" label="Display name" value={name} onChange={setName} />
        <InputField id="username" label="Username" description="Used on the leaderboard." value={username} onChange={setUsername} />
        <div className="flex items-center justify-end gap-3">
          {saveStatus === "saved" && <span className="text-sm text-green-400">Saved</span>}
          {saveStatus === "error" && <span className="text-sm text-red-400">{saveError ?? "Failed to save"}</span>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : "Save changes"}
          </Button>
        </div>
      </div>

      <hr className="border-white/10" />

      {/* Subscription — hidden on MAS */}
      {!isMas && (
        <>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-white">Subscription</p>
              <p className="text-sm text-gray-500 mt-0.5">Your current plan and billing details.</p>
            </div>

            {loadingPlan ? (
              <p className="text-sm text-gray-500">
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Loading…
              </p>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
                {/* Plan badge + action */}
                <div className="flex items-center justify-between">
                  <span className={clsx(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                    isPremium
                      ? "bg-violet-400/10 text-violet-400 border border-violet-400/20"
                      : "bg-white/5 text-gray-400 border border-white/10"
                  )}>
                    {subscription?.billing_plan ?? "free"}
                  </span>
                  <button
                    onClick={() => setModal(ModalType.PREMIUM_PURCHASE)}
                    className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    {isPremium ? "Manage plan" : "Upgrade to Premium →"}
                  </button>
                </div>

                {isPremium && (
                  <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                    <DetailRow label="Billing period" value={formatPeriod(subscription?.billing_period ?? null)} />
                    <DetailRow
                      label={subscription?.auto_renew === false ? "Expires on" : "Renews on"}
                      value={nextDate ?? "—"}
                    />
                    {subscription?.status && (
                      <DetailRow
                        label="Status"
                        value={(() => {
                          if (subscription.status === "trialing" && subscription.next_billing_date) {
                            try {
                              const end = Temporal.Instant.from(subscription.next_billing_date).toZonedDateTimeISO(Temporal.Now.timeZoneId()).toPlainDate();
                              const days = Temporal.Now.plainDateISO().until(end, { largestUnit: "days" }).days;
                              return days > 0 ? `Trialing (${days} day${days === 1 ? "" : "s"} left)` : "Trialing (ends today)";
                            } catch {
                              return "Trialing";
                            }
                          }
                          return subscription.status!.replace("_", " ");
                        })()}
                        valueClass={statusStyle(subscription.status)}
                      />
                    )}
                    {/* Auto-renew toggle */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Auto-renew</span>
                      <button
                        onClick={handleToggleAutoRenew}
                        disabled={togglingAutoRenew}
                        className={clsx(
                          "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                          subscription.auto_renew ? "bg-emerald-500" : "bg-white/20"
                        )}
                      >
                        <span className={clsx(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          subscription.auto_renew ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-white/10" />
        </>
      )}

      {/* Sign out */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label className="text-sm font-medium text-white">Sign out</Label>
          <Description className="text-sm text-gray-500">Sign out of your account on this device.</Description>
        </span>
        <div className="w-40 flex-shrink-0">
          <Button onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? <FontAwesomeIcon icon={faSpinner} spin /> : "Sign out"}
          </Button>
        </div>
      </Field>

      <hr className="border-white/10" />

      {/* Danger zone */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-red-400">Danger zone</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Permanently delete your account and all data associated with it. This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            {deleting ? <FontAwesomeIcon icon={faSpinner} spin /> : "Delete account"}
          </button>
        </div>
      </div>

    </div>
  );
}

export default AccountSettings;
