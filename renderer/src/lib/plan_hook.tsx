"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSupabase } from "./supabase-provider";

/**
 * Plan/subscription state from Supabase. Use usePlan() to gate premium features:
 * - In renderer: `const plan = usePlan(); const isPremium = plan?.billing_plan === "premium";`
 * - Server/Edge Functions: use requirePremium() from _shared/premium.ts
 */
export interface Plan {
  billing_plan?: string | null;
  billing_period?: string | null;
  next_billing_date?: string | null;
  auto_renew?: boolean | null;
  status?: string | null;
}

type PlanContextProps = null | Plan;

interface PlanContextValue {
  plan: PlanContextProps;
  refetchPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export const PlanProvider = ({ children }) => {
  const [plan, setPlan] = useState<PlanContextProps>(null);
  const { supabase, user } = useSupabase();
  const supabaseRef = useRef(supabase);
  const fetchPlanRef = useRef<() => Promise<void>>(() => Promise.resolve());
  supabaseRef.current = supabase;

  const fetchPlan = async () => {
    if (!user) {
      setPlan(null);
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

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

  fetchPlanRef.current = fetchPlan;

  // When an IAP purchase completes (Mac App Store), map the transaction to this user and refetch plan.
  // Register once so we don't add duplicate IPC listeners when user/supabase change.
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI?.onIAPPurchaseComplete) {
      return;
    }
    window.electronAPI.onIAPPurchaseComplete(async (transactionId: string, productId?: string) => {
      try {
        await supabaseRef.current.functions.invoke("map-transaction", {
          body: { transactionId, productId },
        });
        await fetchPlanRef.current();
      } catch (err) {
        console.error("Failed to map IAP transaction:", err);
      }
    });
  }, []);

  const refetchPlan = async () => {
    await fetchPlan();
  };

  const value: PlanContextValue = { plan, refetchPlan };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export function usePlan() {
  const context = useContext(PlanContext);
  return context?.plan ?? null;
}

export function useRefetchPlan() {
  const context = useContext(PlanContext);
  return context?.refetchPlan ?? (async () => {});
}
