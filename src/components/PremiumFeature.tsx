import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Zap } from "lucide-react";
import { ReactNode, useState } from "react";
import UpgradePrompt from "./UpgradePrompt";

type Tier = "analyst" | "professional" | "institutional";

const TIER_RANK: Record<string, number> = {
  analyst: 1,
  pro: 1, // alias
  professional: 2,
  enterprise: 2, // alias
  institutional: 3,
};

const TIER_LABELS: Record<string, string> = {
  analyst: "Analyst ($499/mo)",
  professional: "Professional ($1,499/mo)",
  institutional: "Institutional ($3,999/mo)",
};

interface PremiumFeatureProps {
  /** Minimum tier required to access this feature */
  tier: Tier;
  /** The content to render when access is granted */
  children: ReactNode;
  /** Optional: override the locked message */
  featureName?: string;
  /** If true, show a compact inline lock instead of a full card */
  inline?: boolean;
}

export function useSubscriptionTier() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription-tier", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_tiers")
        .select("tier")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.tier ?? "analyst") as string;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function hasAccess(userTier: string, requiredTier: Tier): boolean {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 0);
}

const PremiumFeature = ({ tier, children, featureName, inline = false }: PremiumFeatureProps) => {
  // Single-tier model: all authenticated users get full access
  return <>{children}</>;
};

export default PremiumFeature;
