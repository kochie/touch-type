import { Plan } from "@/generated/graphql";
import { GET_SUBSCRIPTION } from "@/transactions/getSubscription";
import { useQuery } from "@apollo/client";
import { createContext, useContext } from "react";

type PlanContextProps = null | Plan;

const PlanContext = createContext<PlanContextProps>(null);

export const PlanProvider = ({ children }) => {
  const { data } = useQuery<{ subscription: Plan }>(
    GET_SUBSCRIPTION,
  );

  return <PlanContext.Provider value={data?.subscription ?? null}>{children}</PlanContext.Provider>;
};

export function usePlan() {
  return useContext(PlanContext);
}