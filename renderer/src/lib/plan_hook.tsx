"use client"

import { createContext, useContext, useEffect, useState } from "react";
import { useSupabase } from "./supabase-provider";

// Backwards compatible Plan type
export interface Plan {
  billing_plan?: string | null;
  billing_period?: string | null;
  next_billing_date?: string | null;
  auto_renew?: boolean | null;
  status?: string | null;
}

type PlanContextProps = null | Plan;

const PlanContext = createContext<PlanContextProps>(null);

export const PlanProvider = ({ children }) => {
  const [plan, setPlan] = useState<PlanContextProps>(null);
  const { supabase, user } = useSupabase();

  const fetchPlan = async () => {
    if (!user) {
  );
  
      setPlan(null);
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

  useLayoutEffect(() => {
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return;
    }

    if (data) {
      setPlan({
        billing_plan: data.billing_plan,
        billing_period: data.billing_period,
        next_billing_date: data.next_billing_date,
        auto_renew: data.auto_renew,
        status: data.status,
      });
    } else {
      // User doesn't have a subscription yet, set default free plan
      setPlan({
        billing_plan: 'free',
        billing_period: null,
        next_billing_date: null,
        auto_renew: false,
        status: 'active',
      });
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [user]);
  
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
};

export function usePlan() {
  return useContext(PlanContext);
}
