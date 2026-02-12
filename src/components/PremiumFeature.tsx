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
  const { data: userTier, isLoading } = useSubscriptionTier();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isLoading) return null;

  const granted = hasAccess(userTier ?? "analyst", tier);

  if (granted) return <>{children}</>;

  if (inline) {
    return (
      <button
        onClick={() => setShowUpgrade(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-muted/30 text-muted-foreground text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        <Lock className="h-3 w-3" />
        {featureName ?? "Premium"} · Upgrade
        <UpgradePrompt open={showUpgrade} onClose={() => setShowUpgrade(false)} blockedAction={featureName ?? null} />
      </button>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px]">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {featureName ?? "This feature"} requires {TIER_LABELS[tier] ?? tier}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Upgrade your plan to unlock this capability.
          </p>
        </div>
        <button
          onClick={() => setShowUpgrade(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          View Plans
        </button>
      </div>
      <UpgradePrompt open={showUpgrade} onClose={() => setShowUpgrade(false)} blockedAction={featureName ?? null} />
    </>
  );
};

export default PremiumFeature;
