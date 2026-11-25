"use client";

import Button from "@/components/Button";
import { ModalType, useModal } from "@/lib/modal-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

interface PremiumUpsellProps {
  title: string;
  body: string;
  /** Where the prompt was shown; passed to the purchase modal. */
  source: string;
}

export default function PremiumUpsell({ title, body, source }: PremiumUpsellProps) {
  const { setModal } = useModal();

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/30 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
        <FontAwesomeIcon icon={faLock} className="w-5 h-5 text-violet-700 dark:text-violet-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="text-xs text-fg-muted">{body}</p>
      </div>
      <div className="w-48">
        <Button onClick={() => setModal(ModalType.PREMIUM_PURCHASE, source)}>
          Upgrade to Premium
        </Button>
      </div>
    </div>
  );
}
