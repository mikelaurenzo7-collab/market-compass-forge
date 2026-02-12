import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const FREE_LIMITS: Record<string, number> = {
  ai_research: 100,
  memo_generation: 50,
  enrichment: 50,
};

export function useUsageTracking() {
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [blockedAction, setBlockedAction] = useState<string | null>(null);

  const checkAndTrack = useCallback(
    async (action: string): Promise<boolean> => {
      if (!user) return false;

      const limit = FREE_LIMITS[action];
      if (!limit) {
        // No limit for this action, just track
        await supabase.from("usage_tracking").insert({ user_id: user.id, action });
        return true;
      }

      // Check subscription tier
      const { data: tier } = await supabase
        .from("subscription_tiers")
        .select("tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tier?.tier === "pro" || tier?.tier === "enterprise") {
        await supabase.from("usage_tracking").insert({ user_id: user.id, action });
        return true;
      }

      // Count today's usage
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("usage_tracking")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", action)
        .gte("created_at", startOfDay.toISOString());

      if ((count ?? 0) >= limit) {
        setBlockedAction(action);
        setShowUpgrade(true);
        return false;
      }

      await supabase.from("usage_tracking").insert({ user_id: user.id, action });
      return true;
    },
    [user]
  );

  const dismissUpgrade = useCallback(() => {
    setShowUpgrade(false);
    setBlockedAction(null);
  }, []);

  return { checkAndTrack, showUpgrade, blockedAction, dismissUpgrade };
}
