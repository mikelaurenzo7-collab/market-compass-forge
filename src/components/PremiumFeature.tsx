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
  analyst: "Analyst ($299/mo)",
  professional: "Professional ($599/mo)",
  institutional: "Institutional ($1,999/mo)",
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

  // While loading subscription, show children to avoid flash of locked content
  if (isLoading) return <>{children}</>;

  const currentTier = userTier ?? "analyst";

  if (hasAccess(currentTier, tier)) {
    return <>{children}</>;
  }

  const requiredLabel = TIER_LABELS[tier] ?? tier;
  const feature = featureName ?? "This feature";

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <button onClick={() => setShowUpgrade(true)} className="underline hover:text-foreground transition-colors">
          Upgrade to unlock
        </button>
        <UpgradePrompt open={showUpgrade} onClose={() => setShowUpgrade(false)} blockedAction={null} />
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card/50 p-8 text-center space-y-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{feature} requires {requiredLabel}</h3>
          <p className="text-xs text-muted-foreground mt-1">Upgrade your plan to access this feature.</p>
        </div>
        <button
          onClick={() => setShowUpgrade(true)}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
        >
          <Zap className="h-3 w-3" /> Upgrade Plan
        </button>
      </div>
      <UpgradePrompt open={showUpgrade} onClose={() => setShowUpgrade(false)} blockedAction={null} />
    </>
  );
};

export default PremiumFeature;
