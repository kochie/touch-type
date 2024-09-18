"use client";

import AIAssistant from "@/components/AiAssistant";
import Button from "@/components/Button";
import { Plan } from "@/generated/graphql";
import { ModalType, useModal } from "@/lib/modal-provider";
import { useUser } from "@/lib/user_hook";
import { GET_SUBSCRIPTION } from "@/transactions/getSubscription";
import { useQuery } from "@apollo/client";
import { faSpinnerThird } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function ClientAssistant() {
  const { setModal, modal } = useModal();
  const user = useUser();
  const { data, loading, error } = useQuery<{ subscription: Plan }>(
    GET_SUBSCRIPTION,
  );

  if (error?.networkError || !user) {
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

  if (error) {
    return <div>There was an error checking your subscription</div>;
  }

  if (!data || loading) {
    return (
      <div className="w-full flex justify-center h-full">
        <div className="text-3xl font-semibold my-20">
          Checking Access...{" "}
          <FontAwesomeIcon icon={faSpinnerThird} spin className="mx-5" />
        </div>
      </div>
    );
  }

  if (data.subscription.billing_plan === "free") {
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
