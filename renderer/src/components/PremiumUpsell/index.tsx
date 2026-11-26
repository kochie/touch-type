"use client";

import { useEffect } from "react";
import Button from "@/components/Button";
import { metrics } from "@/lib/metrics";
import { ModalType, useModal } from "@/lib/modal-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import clsx from "clsx";

interface PremiumUpsellProps {
  title: string;
  body: string;
  /** Where the prompt was shown; passed to the purchase modal. */
  source: string;
  /**
   * `banner` sits among content that is still visible. `empty` stands in for
   * a whole locked page, so it is taller and centred.
   */
  layout?: "banner" | "empty";
}

export default function PremiumUpsell({ title, body, source, layout = "banner" }: PremiumUpsellProps) {
  const { setModal } = useModal();
  const { user } = useSupabase();
  const empty = layout === "empty";

  useEffect(() => {
    metrics.count("upsell.viewed", 1, { source, layout, signed_in: !!user });
  }, [source, layout, !!user]);

  // Checkout needs an account, so signed-out viewers are sent to sign in first.
  // The sign-in modal links on to sign-up.
  const action = user
    ? {
        label: "Upgrade to Premium",
        run: () => {
          metrics.count("upsell.clicked", 1, { source, action: "upgrade" });
          setModal(ModalType.PREMIUM_PURCHASE, source);
        },
      }
    : {
        label: "Sign in to unlock",
        run: () => {
          metrics.count("upsell.clicked", 1, { source, action: "sign_in" });
          setModal(ModalType.SIGN_IN);
        },
      };

  return (
    <div
      className={clsx(
        "rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/30 flex",
        empty
          ? "flex-col items-center text-center gap-4 px-6 py-16"
          : "flex-col sm:flex-row sm:items-center gap-4 px-6 py-5",
      )}
    >
      <div
        className={clsx(
          "rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0",
          empty ? "w-14 h-14" : "w-10 h-10",
        )}
      >
        <FontAwesomeIcon
          icon={faLock}
          className={clsx("text-violet-700 dark:text-violet-400", empty ? "w-6 h-6" : "w-5 h-5")}
        />
      </div>
      <div className={clsx(!empty && "flex-1", empty && "max-w-md")}>
        <p className={clsx("font-semibold text-fg", empty ? "text-base" : "text-sm")}>{title}</p>
        <p className="text-xs text-fg-muted">{body}</p>
      </div>
      <div className="w-48">
        <Button onClick={action.run}>{action.label}</Button>
      </div>
    </div>
  );
}
