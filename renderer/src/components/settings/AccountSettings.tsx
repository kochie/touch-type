"use client";

import { useState, useEffect } from "react";
import { Field, Label, Description } from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { faArrowUpRightFromSquare } from "@fortawesome/pro-regular-svg-icons";
import clsx from "clsx";
import { useSupabase } from "@/lib/supabase-provider";
import { useMas } from "@/lib/mas_hook";
import Button from "../Button";

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

export function AccountSettings() {
  const { supabase, user } = useSupabase();
  const isMas = useMas();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [billingPlan, setBillingPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("billing_plan")
        .eq("user_id", user.id)
        .single();

      setBillingPlan(sub?.billing_plan ?? "free");
      setLoadingPlan(false);
    };

    fetchProfile();
  }, [user, supabase]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name,
        preferred_username: username,
      });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { name } });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("This will permanently delete your account and all associated data. Are you sure?")) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user");
      if (error) throw error;
      await supabase.auth.signOut();
    } catch {
      alert("Failed to delete account. Please contact support.");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">

      {/* Profile */}
      <div className="flex flex-col gap-4">
        <InputField
          id="email"
          label="Email"
          description="Your sign-in email address."
          value={user.email ?? ""}
          readOnly
        />
        <InputField
          id="name"
          label="Display name"
          value={name}
          onChange={setName}
        />
        <InputField
          id="username"
          label="Username"
          description="Used on the leaderboard."
          value={username}
          onChange={setUsername}
        />

        <div className="flex items-center justify-end gap-3">
          {saveStatus === "saved" && (
            <span className="text-sm text-green-400">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-400">Failed to save</span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : "Save changes"}
          </Button>
        </div>
      </div>

      <hr className="border-white/10" />

      {/* Plan — hidden on MAS (billing handled by App Store) */}
      {!isMas && (
        <>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-white">Subscription</p>
              <p className="text-sm text-gray-500 mt-0.5">Your current plan and features.</p>
            </div>

            {loadingPlan ? (
              <p className="text-sm text-gray-500">
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Loading…
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300">You are on the</span>
                  <span className={clsx(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                    billingPlan === "premium"
                      ? "bg-sky-400/10 text-sky-400 border border-sky-400/20"
                      : "bg-white/5 text-gray-400 border border-white/10"
                  )}>
                    {billingPlan}
                  </span>
                  <span className="text-sm text-gray-300">plan.</span>
                </div>
                <button
                  onClick={() => window.open(process.env["NEXT_PUBLIC_ACCOUNT_LINK"], "_blank")}
                  className="flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  Manage plan
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3" />
                </button>
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
          <Description className="text-sm text-gray-500">
            Sign out of your account on this device.
          </Description>
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
