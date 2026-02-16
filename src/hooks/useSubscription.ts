import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionState {
  subscribed: boolean;
  plan: string;
  subscription_end: string | null;
  subscription_id: string | null;
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
        upcoming_amount: number | null;
        upcoming_date: string | null;
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 min
    refetchInterval: 60 * 1000,
  });

  return {
    subscribed: data?.subscribed ?? false,
    plan: data?.plan ?? "essential",
    subscription_end: data?.subscription_end ?? null,
    subscription_id: data?.subscription_id ?? null,
    upcoming_amount: data?.upcoming_amount ?? null,
    upcoming_date: data?.upcoming_date ?? null,
    isLoading,
    refetch,
  };
}
