"use client";

import AIAssistant from "@/components/AiAssistant";
import Button from "@/components/Button";
import { ModalType, useModal } from "@/lib/modal-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { usePlan } from "@/lib/plan_hook";
import { faSpinnerThird } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function ClientAssistant() {
  const { setModal } = useModal();
  const { user, isLoading: userLoading } = useSupabase();
  const plan = usePlan();

  if (userLoading) {
    return (
      <div className="w-full flex justify-center h-full">
        <div className="text-3xl font-semibold my-20">
          Loading...{" "}
          <FontAwesomeIcon icon={faSpinnerThird} spin className="mx-5" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col mx-auto justify-center items-center h-full mt-10 gap-6">
        <span className="text-lg font-semibold">
          You need to sign in to use the assistant
        </span>
        <div className="flex gap-6 w-96">
          <Button onClick={() => setModal(ModalType.SIGN_IN)}>Sign In</Button>
          <Button onClick={() => setModal(ModalType.SIGN_UP)}>Sign Up</Button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="w-full flex justify-center h-full">
        <div className="text-3xl font-semibold my-20">
          Checking Access...{" "}
          <FontAwesomeIcon icon={faSpinnerThird} spin className="mx-5" />
        </div>
      </div>
    );
  }

  if (plan.billing_plan === "free") {
    return (
      <div className="flex flex-col mx-auto justify-center items-center h-full mt-10 gap-6">
        <span className="text-lg font-semibold">
          Upgrade to premium to access the assistant
        </span>
        <div className="flex gap-6 w-96">
          <Button
            onClick={() => {
              window.open(process.env["NEXT_PUBLIC_ACCOUNT_LINK"], "_blank");
            }}
          >
            Account Settings
          </Button>
        </div>
      </div>
    );
  }

  return <AIAssistant />;
}
