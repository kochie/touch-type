"use client"

import { Plan } from "@/generated/graphql";
import { GET_SUBSCRIPTION } from "@/transactions/getSubscription";
import { useQuery } from "@apollo/client";
import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { useUser } from "./user_hook";

type PlanContextProps = null | Plan;

const PlanContext = createContext<PlanContextProps>(null);

export const PlanProvider = ({ children }) => {
  const [plan, setPlan] = useState<PlanContextProps>(null);

  const { data, refetch } = useQuery<{ subscription: Plan }>(
    GET_SUBSCRIPTION,
    {fetchPolicy: "no-cache"}
  );
  
  const user = useUser();

  useEffect(() => {
    if (!user) refetch()
  }, [user])

  useLayoutEffect(() => {
    if (!user) {
      setPlan(null)
      return
    }

    if (data) {
      setPlan(data.subscription)
    }
  }, [user, data])
  
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
};

export function usePlan() {
  return useContext(PlanContext);
}