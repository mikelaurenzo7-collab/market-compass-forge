import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionState {
  subscribed: boolean;
  plan: string;
  subscription_end: string | null;
  subscription_id: string | null;
  stripe_customer_id: string | null;
  subscription_status: string;
  billing_interval: string;
  last_webhook_event_at: string | null;
  upcoming_amount: number | null;
  upcoming_date: string | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["subscription-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data as {
        subscribed: boolean;
        plan: string;
        subscription_end: string | null;
        subscription_id: string | null;
        stripe_customer_id: string | null;
        subscription_status: string;
        billing_interval: string;
        last_webhook_event_at: string | null;
        upcoming_amount: number | null;
        upcoming_date: string | null;
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    subscribed: data?.subscribed ?? false,
    plan: data?.plan ?? "essential",
    subscription_end: data?.subscription_end ?? null,
    subscription_id: data?.subscription_id ?? null,
    stripe_customer_id: data?.stripe_customer_id ?? null,
    subscription_status: data?.subscription_status ?? "none",
    billing_interval: data?.billing_interval ?? "month",
    last_webhook_event_at: data?.last_webhook_event_at ?? null,
    upcoming_amount: data?.upcoming_amount ?? null,
    upcoming_date: data?.upcoming_date ?? null,
    isLoading,
    refetch,
  };
}
