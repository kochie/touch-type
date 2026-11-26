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

  useEffect(() => {
    if (!user) {
      setPlan(null);
      return;
    }

    let cancelled = false;

    const fetchPlan = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;

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

    fetchPlan();

    // Live updates: webhooks, purchases and manual changes write to this row
    // server-side, so re-read it whenever it changes instead of trusting the
    // value fetched at sign-in. Refetching (rather than using payload.new)
    // also covers DELETE events, whose payload has no new row.
    const channel = supabase
      .channel(`subscriptions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchPlan();
        },
      )
      .subscribe();

    // Fallback if the realtime socket was dropped while the app was in the
    // background.
    const onFocus = () => {
      fetchPlan();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      channel.unsubscribe();
    };
  }, [user, supabase]);

  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
};

// Mirrors checkPremium() in the edge functions' _shared/premium.ts so the UI
// and the server agree on who is premium (active or trialing premium plan).
export function isPremiumPlan(plan: Plan | null): boolean {
  if (!plan || plan.billing_plan !== 'premium') return false;
  const status = plan.status?.toLowerCase();
  return status === 'active' || status === 'trialing';
}

export function usePlan() {
  return useContext(PlanContext);
}

export type PremiumAccess = "loading" | "signed-out" | "free" | "premium";

// A stored session that can't be refreshed (offline, server down) keeps
// auth's isLoading true while it retries. Past this, treat the viewer as
// signed out instead of leaving a locked page blank.
const AUTH_GRACE_MS = 1500;

function useAuthSettled(isLoading: boolean): boolean {
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setGaveUp(true), AUTH_GRACE_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);
  return !isLoading || gaveUp;
}

/**
 * Where the viewer stands for premium content. `plan` alone can't say: it is
 * null both while loading and when signed out, which left locked pages blank.
 */
export function usePremiumAccess(): PremiumAccess {
  const { user, isLoading } = useSupabase();
  const plan = usePlan();
  const authSettled = useAuthSettled(isLoading);
  if (!authSettled) return "loading";
  if (!user) return "signed-out";
  if (!plan) return "loading";
  return isPremiumPlan(plan) ? "premium" : "free";
}
