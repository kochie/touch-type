"use client"

import AIAssistant from "@/components/AiAssistant";
import { Plan } from "@/generated/graphql";
import { GET_SUBSCRIPTION } from "@/transactions/getSubscription";
import { useQuery, useSuspenseQuery } from "@apollo/client";

export function ClientAssistant() {
    const { data, error } = useQuery<{subscription: Plan}>(GET_SUBSCRIPTION);
    
    if (!data || error) {
      return <div>Loading...</div>;
    }

    console.log(data)

    if (data.subscription.billing_plan === "free") {
      return <div>Upgrade to premium to access the assistant</div>;
    }
  
  
    return <AIAssistant />;


}