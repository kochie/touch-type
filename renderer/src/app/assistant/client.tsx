"use client";

import AIAssistant from "@/components/AiAssistant";
import { Plan } from "@/generated/graphql";
import { GET_SUBSCRIPTION } from "@/transactions/getSubscription";
import { useQuery } from "@apollo/client";
import { faSpinnerThird } from "@fortawesome/pro-duotone-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function ClientAssistant() {

  const { data, loading, error } = useQuery<{ subscription: Plan }>(
    GET_SUBSCRIPTION,
  );
  
  console.log("error", error);

  if (error?.networkError) {
    console.error("Network Error", error.networkError);
    return <div>There was a network error checking your subscription</div>;
  }

  if (error) {
    console.log(error)
    console.error("Error", error);
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
    return <div>Upgrade to premium to access the assistant</div>;
  }

  return <AIAssistant />;
}
