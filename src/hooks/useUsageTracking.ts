import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUsageTracking() {
  const { user } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [blockedAction, setBlockedAction] = useState<string | null>(null);

  const checkAndTrack = useCallback(
    async (action: string): Promise<boolean> => {
      if (!user) return false;

      try {
        // Server-side entitlement check
        const { data, error } = await supabase.functions.invoke("check-entitlement", {
          body: { feature_key: action, track: true },
        });

        if (error || !data?.allowed) {
          if (data?.upgrade_required || data?.reason?.includes("limit")) {
            setBlockedAction(action);
            setShowUpgrade(true);
          }
          return false;
        }

        return true;
      } catch {
        // Fallback: allow but don't track
        return true;
      }
    },
    [user]
  );

  const dismissUpgrade = useCallback(() => {
    setShowUpgrade(false);
    setBlockedAction(null);
  }, []);

  return { checkAndTrack, showUpgrade, blockedAction, dismissUpgrade };
}
