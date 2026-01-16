// Supabase query for getting subscription
import { getSupabaseClient } from "@/lib/supabase-client";
import type { Subscription } from "@/types/supabase";

export interface Plan {
  billing_plan?: string | null;
  billing_period?: string | null;
  next_billing_date?: string | null;
  auto_renew?: boolean | null;
  status?: string | null;
}

export async function getSubscription(): Promise<Plan> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      billing_plan: 'free',
      billing_period: null,
      next_billing_date: null,
      auto_renew: false,
      status: 'active',
    };
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    return {
      billing_plan: 'free',
      billing_period: null,
      next_billing_date: null,
      auto_renew: false,
      status: 'active',
    };
  }

  return {
    billing_plan: data.billing_plan,
    billing_period: data.billing_period,
    next_billing_date: data.next_billing_date,
    auto_renew: data.auto_renew,
    status: data.status,
  };
}
